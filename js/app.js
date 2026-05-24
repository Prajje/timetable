import { todayISO, addDays } from './lib/dates.js';
import { summarizeDay } from './lib/aggregate.js';
import { computeStreak } from './lib/streak.js';
import { XP_VALUES, xpForTask } from './lib/xp.js';
import { loadDay, loadHistory, updateTask, createTasks } from './storage.js';
import { renderTopbar } from './ui/topbar.js';
import { renderDay, onTaskToggle, onEnergyPick } from './ui/day.js';
import {
  confettiBurst, xpPopup, playTick, playBossKill, showBossBanner,
  showLootIfDue, toast, loadSoundPref
} from './ui/effects.js';
import { openDrawer, closeDrawer } from './ui/drawer.js';
import { buildPlanDrawer, tasksToSkeleton } from './ui/plan-drawer.js';
import { buildHistoryDrawer, renderHistoryDetail } from './ui/history.js';
import { buildSettingsDrawer } from './ui/settings.js';

const state = {
  date: todayISO(),
  tasks: [],
  history: []
};

async function refresh() {
  state.tasks = await loadDay(state.date);
  state.history = await loadHistory(60);
  renderAll();
}

function renderAll() {
  const { totalXp } = summarizeDay(state.tasks);
  const lifetimeXp = state.history.reduce((s, t) => s + xpForTask(t), 0);
  const dayBuckets = bucketHistoryByDate(state.history);
  const { streak } = computeStreak(dayBuckets, state.date);
  renderTopbar({ totalLifetimeXp: lifetimeXp, todayXp: totalXp, streak });
  renderDay(state.tasks);
  document.getElementById('btn-plan-tomorrow').textContent =
    state.tasks.length === 0 ? '+ Plan today' : '+ Plan tomorrow';
}

function bucketHistoryByDate(allTasks) {
  const m = new Map();
  for (const t of allTasks) {
    if (!t.date) continue;
    if (!m.has(t.date)) m.set(t.date, 0);
    if (t.type === 'boss' && t.done) m.set(t.date, m.get(t.date) + 1);
  }
  return [...m.entries()]
    .map(([date, bossesCompleted]) => ({ date, bossesCompleted }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

onTaskToggle(async (task, rowEl) => {
  const newDone = !task.done;
  const completedAt = newDone ? todayISO() : null;
  const idx = state.tasks.findIndex(t => t.id === task.id);
  const prev = state.tasks[idx];
  state.tasks[idx] = { ...prev, done: newDone, completedAt };
  renderAll();

  if (newDone) {
    const rect = rowEl.getBoundingClientRect();
    const amount = XP_VALUES[task.type] ?? 0;
    const x = rect.right - 20;
    const y = rect.top;
    xpPopup({ x, y, amount, kind: task.type === 'boss' ? 'boss' : 'normal' });
    confettiBurst({ x, y, big: task.type === 'boss' }).catch(() => {});
    if (task.type === 'boss') {
      playBossKill();
      showBossBanner();
    } else {
      playTick();
    }
    showLootIfDue();
  }

  try {
    await updateTask(task.id, { done: newDone, completedAt });
    state.history = await loadHistory(60);
    renderAll();
  } catch (e) {
    state.tasks[idx] = prev;
    renderAll();
    toast(`Save failed: ${e.message}`);
  }
});

onEnergyPick(async (group, emoji) => {
  const updates = state.tasks.filter(t => t.block === group.blockIndex);
  for (const t of updates) t.energy = emoji;
  renderAll();
  for (const t of updates) {
    await updateTask(t.id, { energy: emoji }).catch(() => {});
  }
});

document.getElementById('btn-plan-tomorrow').addEventListener('click', async () => {
  const planningToday = state.tasks.length === 0;
  const targetDate = planningToday ? state.date : addDays(state.date, 1);
  const skeletonSource = planningToday
    ? await loadDay(addDays(state.date, -1))
    : state.tasks;
  const skeleton = tasksToSkeleton(skeletonSource);
  const drawer = document.getElementById('drawer-plan');
  openDrawer(drawer, buildPlanDrawer({
    skeleton,
    targetDate,
    onCancel: () => closeDrawer(drawer),
    onSave: async (newTasks) => {
      try {
        await createTasks(newTasks);
        closeDrawer(drawer);
        toast(`Plan saved for ${targetDate}.`);
        if (planningToday) await refresh();
      } catch (e) {
        toast(`Save failed: ${e.message}`);
      }
    }
  }));
});

document.getElementById('btn-history').addEventListener('click', () => {
  const drawer = document.getElementById('drawer-history');
  openDrawer(drawer, buildHistoryDrawer({
    history: state.history,
    onClose: () => closeDrawer(drawer),
    onPickDate: (date, tasks) => renderHistoryDetail(date, tasks)
  }));
});

document.getElementById('btn-settings').addEventListener('click', () => {
  const drawer = document.getElementById('drawer-settings');
  openDrawer(drawer, buildSettingsDrawer({
    onClose: () => closeDrawer(drawer),
    onDataChanged: () => refresh()
  }));
});

(async function init() {
  await loadSoundPref();
  await refresh();
})();

import { groupByBlock } from '../lib/aggregate.js';

let onTaskToggleHandler = null;
let onEnergyPickHandler = null;
let onBlockEditHandler = null;
export function onTaskToggle(fn) { onTaskToggleHandler = fn; }
export function onEnergyPick(fn) { onEnergyPickHandler = fn; }
export function onBlockEdit(fn) { onBlockEditHandler = fn; }

const ENERGY_EMOJIS = ['😩', '😐', '🙂', '⚡'];

function timeKey(t) {
  if (!t.time) return Number.POSITIVE_INFINITY;
  const [h, m] = t.time.split(':').map(Number);
  return h * 60 + m;
}

function formatTime12(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function renderDay(tasks) {
  const root = document.getElementById('day-view');
  root.innerHTML = '';
  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No plan for today. Tap "+ Plan today" to start.';
    root.appendChild(empty);
    return;
  }
  for (const group of groupByBlock(tasks)) {
    // Sort within block: time-tagged first (asc), then time-less by order
    group.tasks.sort((a, b) => {
      const ta = timeKey(a), tb = timeKey(b);
      if (ta !== tb) return ta - tb;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    root.appendChild(renderBlock(group));
  }
}

function renderBlock(group) {
  const card = document.createElement('section');
  card.className = 'block-card';

  const header = document.createElement('div');
  header.className = 'block-header';

  const title = document.createElement('div');
  title.className = 'block-title';
  title.textContent = group.blockTitle || `Block ${group.blockIndex}`;
  header.appendChild(title);

  const headerRight = document.createElement('div');
  headerRight.style.cssText = 'display:flex; gap:8px; align-items:center;';

  const energy = document.createElement('div');
  energy.className = 'energy-picker';
  for (const emoji of ENERGY_EMOJIS) {
    const b = document.createElement('button');
    b.textContent = emoji;
    if (group.energy === emoji) b.classList.add('selected');
    b.addEventListener('click', (e) => { e.stopPropagation(); onEnergyPickHandler?.(group, emoji); });
    energy.appendChild(b);
  }
  headerRight.appendChild(energy);

  const editBtn = document.createElement('button');
  editBtn.textContent = '✏';
  editBtn.title = 'Edit plan';
  editBtn.style.cssText = 'background:transparent; border:none; color:var(--text-dim); font-size:16px; padding:4px 6px; border-radius:6px; cursor:pointer;';
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); onBlockEditHandler?.(); });
  headerRight.appendChild(editBtn);

  header.appendChild(headerRight);
  card.appendChild(header);

  for (const t of group.tasks) card.appendChild(renderTask(t));
  return card;
}

function renderTask(t) {
  const row = document.createElement('div');
  row.className = 'task-row';
  if (t.done) row.classList.add('done');
  if (t.type === 'boss') row.classList.add('boss');
  row.dataset.taskId = t.id;

  const box = document.createElement('div');
  box.className = 'task-checkbox';
  box.textContent = t.done ? '✓' : '';
  row.appendChild(box);

  const content = document.createElement('div');
  content.className = 'task-content';

  const titleEl = document.createElement('div');
  titleEl.className = 'task-title';
  const prefix = t.type === 'boss' ? '⚔ ' : '';
  if (t.time) {
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTime12(t.time) + ' · ';
    timeSpan.style.cssText = 'color:var(--text-dim); font-weight:500; margin-right:2px;';
    titleEl.appendChild(timeSpan);
    titleEl.appendChild(document.createTextNode(prefix + t.title));
  } else {
    titleEl.textContent = prefix + t.title;
  }
  content.appendChild(titleEl);

  if (t.description) {
    const d = document.createElement('div');
    d.className = 'task-desc';
    d.textContent = t.description;
    content.appendChild(d);
  }
  if (t.minMins) {
    const m = document.createElement('div');
    m.className = 'task-meta';
    m.textContent = `min ${t.minMins} mins`;
    content.appendChild(m);
  }

  row.appendChild(content);
  row.addEventListener('click', () => onTaskToggleHandler?.(t, row));
  return row;
}

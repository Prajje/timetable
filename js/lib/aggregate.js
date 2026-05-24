import { totalXpForTasks } from './xp.js';

export function summarizeDay(tasks) {
  const bosses = tasks.filter(t => t.type === 'boss');
  const bossesCompleted = bosses.filter(t => t.done).length;
  const bossesPlanned = bosses.length;
  let completionStatus = 'missed';
  if (bossesPlanned > 0 && bossesCompleted === bossesPlanned) completionStatus = 'all-bosses';
  else if (bossesCompleted > 0) completionStatus = 'partial';
  return { totalXp: totalXpForTasks(tasks), bossesCompleted, bossesPlanned, completionStatus };
}

export function groupByBlock(tasks) {
  const m = new Map();
  for (const t of tasks) {
    if (!m.has(t.block)) m.set(t.block, { blockIndex: t.block, blockTitle: t.blockTitle ?? '', energy: t.energy ?? '', tasks: [] });
    m.get(t.block).tasks.push(t);
  }
  const groups = [...m.values()].sort((a, b) => a.blockIndex - b.blockIndex);
  for (const g of groups) g.tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return groups;
}

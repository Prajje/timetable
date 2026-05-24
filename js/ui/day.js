import { groupByBlock } from '../lib/aggregate.js';

let onTaskToggleHandler = null;
let onEnergyPickHandler = null;
export function onTaskToggle(fn) { onTaskToggleHandler = fn; }
export function onEnergyPick(fn) { onEnergyPickHandler = fn; }

const ENERGY_EMOJIS = ['😩', '😐', '🙂', '⚡'];

export function renderDay(tasks) {
  const root = document.getElementById('day-view');
  root.innerHTML = '';
  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No plan for today. Tap "+ Plan tomorrow" to start.';
    root.appendChild(empty);
    return;
  }
  for (const group of groupByBlock(tasks)) {
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

  const energy = document.createElement('div');
  energy.className = 'energy-picker';
  for (const emoji of ENERGY_EMOJIS) {
    const b = document.createElement('button');
    b.textContent = emoji;
    if (group.energy === emoji) b.classList.add('selected');
    b.addEventListener('click', (e) => { e.stopPropagation(); onEnergyPickHandler?.(group, emoji); });
    energy.appendChild(b);
  }
  header.appendChild(energy);
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
  titleEl.textContent = t.type === 'boss' ? `⚔ ${t.title}` : t.title;
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

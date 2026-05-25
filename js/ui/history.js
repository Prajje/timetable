import { addDays, todayISO, isoWeekStart } from '../lib/dates.js';
import { summarizeDay } from '../lib/aggregate.js';

export function buildHistoryDrawer({ history, onClose, onPickDate }) {
  return (root) => {
    const h = document.createElement('h2');
    h.textContent = 'History';
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    const today = todayISO();
    const tasksByDate = new Map();
    for (const t of history) {
      if (!t.date) continue;
      if (!tasksByDate.has(t.date)) tasksByDate.set(t.date, []);
      tasksByDate.get(t.date).push(t);
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-bottom:12px;';
    for (const d of ['M','T','W','T','F','S','S']) {
      const cell = document.createElement('div');
      cell.textContent = d;
      cell.style.cssText = 'text-align:center; color:var(--text-dim); font-size:11px;';
      grid.appendChild(cell);
    }
    const start = isoWeekStart(addDays(today, -28));
    for (let i = 0; i < 35; i++) {
      const date = addDays(start, i);
      const tasks = tasksByDate.get(date) ?? [];
      const sum = summarizeDay(tasks);
      const cell = document.createElement('button');
      cell.style.cssText = 'aspect-ratio:1; border:none; border-radius:6px; font-size:11px; padding:0; cursor:pointer;';
      cell.textContent = String(Number(date.split('-')[2]));
      let bg = 'var(--surface-2)', color = 'var(--text-dim)';
      if (tasks.length > 0) {
        if (sum.completionStatus === 'all-bosses') { bg = 'var(--accent)'; color = 'var(--bg)'; }
        else if (sum.completionStatus === 'partial') { bg = 'var(--green)'; color = 'var(--bg)'; }
        else if (sum.completionStatus === 'missed') { bg = 'var(--red)'; color = '#fff'; }
      }
      if (date === today) cell.style.outline = '2px solid var(--text)';
      if (date > today) {
        cell.style.opacity = '0.4';
        cell.style.cursor = 'default';
      } else {
        cell.addEventListener('click', () => onPickDate(date));
      }
      cell.style.background = bg;
      cell.style.color = color;
      grid.appendChild(cell);
    }
    root.appendChild(grid);

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; gap:12px; font-size:11px; color:var(--text-dim); flex-wrap:wrap;';
    legend.innerHTML = `
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--accent);vertical-align:middle;"></span> all bosses</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--green);vertical-align:middle;"></span> partial</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--red);vertical-align:middle;"></span> missed</span>
    `;
    root.appendChild(legend);

    const hint = document.createElement('div');
    hint.textContent = 'Tap any day to open it.';
    hint.style.cssText = 'margin-top:12px; font-size:12px; color:var(--text-dim); text-align:center;';
    root.appendChild(hint);

    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'margin-top:14px; width:100%; padding:12px; background:transparent; color:var(--text); border:1px solid var(--surface-2); border-radius:8px;';
    close.addEventListener('click', onClose);
    root.appendChild(close);
  };
}

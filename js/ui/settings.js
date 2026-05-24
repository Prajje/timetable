import { isSoundEnabled, setSoundEnabled } from './effects.js';
import { exportAll, importAll, clearAll } from '../storage.js';

export function buildSettingsDrawer({ onClose, onDataChanged }) {
  return (root) => {
    const h = document.createElement('h2');
    h.textContent = 'Settings';
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    const soundRow = document.createElement('label');
    soundRow.style.cssText = 'display:flex; justify-content:space-between; padding:10px 0; align-items:center;';
    const soundLabel = document.createElement('span'); soundLabel.textContent = 'Sound effects';
    const soundInput = document.createElement('input'); soundInput.type = 'checkbox';
    soundInput.checked = isSoundEnabled();
    soundInput.addEventListener('change', () => setSoundEnabled(soundInput.checked));
    soundRow.append(soundLabel, soundInput);
    root.appendChild(soundRow);

    const exportRow = document.createElement('div');
    exportRow.style.cssText = 'padding:10px 0; border-top:1px solid var(--surface-2);';
    exportRow.innerHTML = `<div style="margin-bottom:4px;">Backup data</div>
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:8px;">Download a JSON file of all your tasks. Do this weekly so you don't lose data if you clear your browser.</div>`;
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Download backup';
    exportBtn.style.cssText = 'padding:8px 16px; background:var(--accent); color:var(--bg); border:none; border-radius:6px;';
    exportBtn.addEventListener('click', async () => {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    exportRow.appendChild(exportBtn);
    root.appendChild(exportRow);

    const importRow = document.createElement('div');
    importRow.style.cssText = 'padding:10px 0; border-top:1px solid var(--surface-2);';
    importRow.innerHTML = `<div style="margin-bottom:4px;">Restore data</div>
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:8px;">Replaces all current data with a previously downloaded backup.</div>`;
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = 'application/json';
    importInput.style.cssText = 'display:block; margin-bottom:6px;';
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      if (!confirm('Replace all current data with this backup? Current tasks will be lost.')) {
        importInput.value = '';
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        await importAll(parsed);
        onDataChanged?.();
        onClose();
      } catch (e) {
        alert('Import failed: ' + e.message);
      }
    });
    importRow.appendChild(importInput);
    root.appendChild(importRow);

    const clearRow = document.createElement('div');
    clearRow.style.cssText = 'padding:10px 0; border-top:1px solid var(--surface-2);';
    clearRow.innerHTML = `<div style="margin-bottom:6px;">Danger zone</div>`;
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear all data';
    clearBtn.style.cssText = 'padding:8px 16px; background:transparent; color:var(--red); border:1px solid var(--red); border-radius:6px;';
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Permanently delete all timetable data? This cannot be undone.')) return;
      await clearAll();
      onDataChanged?.();
      onClose();
    });
    clearRow.appendChild(clearBtn);
    root.appendChild(clearRow);

    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'margin-top:14px; width:100%; padding:12px; background:transparent; color:var(--text); border:1px solid var(--surface-2); border-radius:8px;';
    close.addEventListener('click', onClose);
    root.appendChild(close);
  };
}

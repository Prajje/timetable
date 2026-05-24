import { describe, it, expect } from 'vitest';
import { loadDay, loadHistory, createTasks, updateTask, deleteTask, exportAll, importAll, clearAll, getSettings, setSetting } from '../js/storage.js';

describe('createTasks', () => {
  it('assigns IDs and persists', async () => {
    const created = await createTasks([
      { title: 'A', date: '2026-05-24', block: 1, blockTitle: 'M', type: 'power_up', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' }
    ]);
    expect(created).toHaveLength(1);
    expect(created[0].id).toBeTruthy();
    expect(created[0].title).toBe('A');
  });
});

describe('loadDay', () => {
  it('returns tasks filtered by date', async () => {
    await createTasks([
      { title: 'A', date: '2026-05-24', block: 1, blockTitle: 'M', type: 'yolo', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' },
      { title: 'B', date: '2026-05-25', block: 1, blockTitle: 'M', type: 'yolo', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' }
    ]);
    const day = await loadDay('2026-05-24');
    expect(day).toHaveLength(1);
    expect(day[0].title).toBe('A');
  });

  it('returns [] for unknown date', async () => {
    expect(await loadDay('2099-01-01')).toEqual([]);
  });
});

describe('updateTask', () => {
  it('applies partial update', async () => {
    const [t] = await createTasks([
      { title: 'A', date: '2026-05-24', block: 1, blockTitle: 'M', type: 'boss', description: '', minMins: 45, order: 0, done: false, completedAt: null, energy: '' }
    ]);
    const updated = await updateTask(t.id, { done: true, completedAt: '2026-05-24' });
    expect(updated.done).toBe(true);
    expect(updated.completedAt).toBe('2026-05-24');
    expect(updated.title).toBe('A');
  });

  it('throws on unknown id', async () => {
    await expect(updateTask('not-real', { done: true })).rejects.toThrow();
  });
});

describe('deleteTask', () => {
  it('removes the task', async () => {
    const [t] = await createTasks([
      { title: 'A', date: '2026-05-24', block: 1, blockTitle: 'M', type: 'yolo', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' }
    ]);
    await deleteTask(t.id);
    expect(await loadDay('2026-05-24')).toEqual([]);
  });
});

describe('loadHistory', () => {
  it('returns tasks from the last N days', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await createTasks([
      { title: 'Today', date: today, block: 1, blockTitle: 'M', type: 'yolo', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' },
      { title: 'Ancient', date: '2000-01-01', block: 1, blockTitle: 'M', type: 'yolo', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' }
    ]);
    const h = await loadHistory(30);
    expect(h.map(t => t.title)).toContain('Today');
    expect(h.map(t => t.title)).not.toContain('Ancient');
  });
});

describe('export/import/clear', () => {
  it('exports and re-imports', async () => {
    await createTasks([
      { title: 'A', date: '2026-05-24', block: 1, blockTitle: 'M', type: 'yolo', description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' }
    ]);
    const blob = await exportAll();
    await clearAll();
    expect(await loadDay('2026-05-24')).toEqual([]);
    await importAll(blob);
    expect((await loadDay('2026-05-24'))[0].title).toBe('A');
  });
});

describe('settings', () => {
  it('reads default and writes', async () => {
    expect((await getSettings()).soundEnabled).toBe(true);
    await setSetting('soundEnabled', false);
    expect((await getSettings()).soundEnabled).toBe(false);
  });
});

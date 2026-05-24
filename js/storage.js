const KEY = 'timetable.data';

const DEFAULT_DATA = { tasks: [], settings: { soundEnabled: true } };

function readAll() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return structuredClone(DEFAULT_DATA);
  try {
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings ?? {}) }
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function loadDay(date) {
  return readAll().tasks.filter(t => t.date === date);
}

export async function loadHistory(days = 30) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return readAll().tasks.filter(t => t.date && t.date >= cutoffISO);
}

export async function createTasks(tasks) {
  const data = readAll();
  const created = tasks.map(t => ({ ...t, id: newId() }));
  data.tasks.push(...created);
  writeAll(data);
  return created;
}

export async function updateTask(id, patch) {
  const data = readAll();
  const idx = data.tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Task ${id} not found`);
  data.tasks[idx] = { ...data.tasks[idx], ...patch };
  writeAll(data);
  return data.tasks[idx];
}

export async function deleteTask(id) {
  const data = readAll();
  data.tasks = data.tasks.filter(t => t.id !== id);
  writeAll(data);
}

export async function exportAll() {
  return readAll();
}

export async function importAll(blob) {
  if (!blob || typeof blob !== 'object') throw new Error('Invalid backup file');
  const tasks = Array.isArray(blob.tasks) ? blob.tasks : [];
  const settings = { ...DEFAULT_DATA.settings, ...(blob.settings ?? {}) };
  writeAll({ tasks, settings });
}

export async function clearAll() {
  localStorage.removeItem(KEY);
}

export async function getSettings() {
  return readAll().settings;
}

export async function setSetting(key, value) {
  const data = readAll();
  data.settings[key] = value;
  writeAll(data);
}

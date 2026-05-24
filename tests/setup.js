import { beforeEach } from 'vitest';

// Node 22+ ships an experimental built-in localStorage that lacks
// .clear() and shadows jsdom's. Install a simple in-memory polyfill
// that overrides whatever's there.
class MemoryStorage {
  constructor() { this._data = new Map(); }
  get length() { return this._data.size; }
  key(i) { return [...this._data.keys()][i] ?? null; }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null; }
  setItem(k, v) { this._data.set(String(k), String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: storage, writable: true, configurable: true
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storage, writable: true, configurable: true
  });
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

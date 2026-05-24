# Timetable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an ADHD-tuned gamified daily planner. Pure static site (GitHub Pages), data in localStorage. No accounts, no backend.

**Architecture:** Vanilla HTML/CSS/JS served as static files. The only storage is `localStorage["timetable.data"]` — one JSON blob holding tasks + settings. Pure logic (XP, streak, dates, aggregation) lives in `js/lib/` and is unit-tested with Vitest. A `storage.js` module wraps localStorage behind a clean interface so a future backend swap (Notion + Vercel) only requires rewriting that one file.

**Tech Stack:**
- Node.js 20, ESM (`"type": "module"`)
- Vitest (unit tests) with jsdom for DOM tests
- `canvas-confetti` (visual effects, lazy-loaded from CDN at runtime)
- GitHub Pages (hosting)
- Vanilla JS, no framework, no bundler

**File structure** (locked in):
```
timetable/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js                # Entry, orchestration
│   ├── storage.js            # localStorage CRUD behind clean interface
│   ├── lib/                  # Pure functions
│   │   ├── dates.js
│   │   ├── xp.js
│   │   ├── level.js
│   │   ├── streak.js
│   │   └── aggregate.js
│   └── ui/
│       ├── topbar.js
│       ├── day.js
│       ├── effects.js        # Confetti, XP popups, sounds, loot drops
│       ├── drawer.js         # Generic slide-up drawer
│       ├── plan-drawer.js    # Night-planning drawer
│       ├── history.js        # History calendar drawer
│       └── settings.js       # Settings drawer
├── tests/
│   └── lib/{dates,xp,level,streak,aggregate}.test.js
├── tests/storage.test.js
├── docs/superpowers/
│   ├── specs/2026-05-24-timetable-design.md
│   └── plans/2026-05-24-timetable-plan.md
├── package.json
├── vitest.config.js
├── .gitignore
└── README.md
```

**Convention:** Conventional commits. `test:`, `feat:`, `fix:`, `chore:`, `docs:`.

---

## Phase 1 — Foundation

### Task 1: package.json + dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "timetable",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "npx http-server -p 3000 -c-1 -o",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "http-server": "^14.1.1"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
coverage/
.DS_Store
*.log
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: `node_modules/` populated, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: initialize package.json with vitest + http-server"
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.js`

- [ ] **Step 1: Create `vitest.config.js`**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    environmentMatchGlobs: [
      ['tests/storage.test.js', 'jsdom'],
      ['tests/ui/**', 'jsdom']
    ]
  }
});
```

- [ ] **Step 2: Sanity-check**

Run: `npm test`
Expected: "No test files found" with no other error. Config parses.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.js
git commit -m "chore: configure vitest"
```

---

## Phase 2 — Pure logic (js/lib/)

All modules in `js/lib/` are pure ESM with no DOM or storage dependencies.

### Task 3: Date utilities

**Files:**
- Create: `js/lib/dates.js`
- Test: `tests/lib/dates.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/dates.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { toISODate, addDays, isoWeekStart, isSameISOWeek, todayISO } from '../../js/lib/dates.js';

describe('toISODate', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    expect(toISODate(new Date(2026, 4, 24))).toBe('2026-05-24');
  });
  it('zero-pads', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('adds days', () => {
    expect(addDays('2026-05-24', 1)).toBe('2026-05-25');
    expect(addDays('2026-05-24', -1)).toBe('2026-05-23');
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
  });
});

describe('isoWeekStart', () => {
  it('returns Monday of the ISO week', () => {
    expect(isoWeekStart('2026-05-24')).toBe('2026-05-18'); // Sun -> Mon prior
    expect(isoWeekStart('2026-05-18')).toBe('2026-05-18'); // Mon -> same
  });
});

describe('isSameISOWeek', () => {
  it('compares ISO weeks', () => {
    expect(isSameISOWeek('2026-05-18', '2026-05-24')).toBe(true);
    expect(isSameISOWeek('2026-05-17', '2026-05-18')).toBe(false);
  });
});

describe('todayISO', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `js/lib/dates.js`**

```javascript
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function isoWeekStart(iso) {
  const d = fromISODate(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

export function isSameISOWeek(a, b) {
  return isoWeekStart(a) === isoWeekStart(b);
}

export function todayISO() {
  return toISODate(new Date());
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/lib/dates.js tests/lib/dates.test.js
git commit -m "feat(lib): date utilities"
```

---

### Task 4: XP calculation

**Files:**
- Create: `js/lib/xp.js`
- Test: `tests/lib/xp.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/xp.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { xpForTask, totalXpForTasks, XP_VALUES } from '../../js/lib/xp.js';

describe('xpForTask', () => {
  it('returns 10 for yolo', () => { expect(xpForTask({ type: 'yolo', done: true })).toBe(10); });
  it('returns 20 for power_up', () => { expect(xpForTask({ type: 'power_up', done: true })).toBe(20); });
  it('returns 20 for regular', () => { expect(xpForTask({ type: 'regular', done: true })).toBe(20); });
  it('returns 50 for boss', () => { expect(xpForTask({ type: 'boss', done: true })).toBe(50); });
  it('returns 0 if not done', () => { expect(xpForTask({ type: 'boss', done: false })).toBe(0); });
  it('returns 0 for unknown type', () => { expect(xpForTask({ type: 'mystery', done: true })).toBe(0); });
});

describe('totalXpForTasks', () => {
  it('sums xp', () => {
    expect(totalXpForTasks([
      { type: 'power_up', done: true },
      { type: 'yolo', done: true },
      { type: 'boss', done: false },
      { type: 'regular', done: true }
    ])).toBe(50);
  });
  it('returns 0 for empty', () => { expect(totalXpForTasks([])).toBe(0); });
});

describe('XP_VALUES', () => {
  it('exposes table', () => { expect(XP_VALUES.boss).toBe(50); });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `js/lib/xp.js`**

```javascript
export const XP_VALUES = Object.freeze({
  yolo: 10,
  power_up: 20,
  regular: 20,
  boss: 50
});

export function xpForTask(task) {
  if (!task.done) return 0;
  return XP_VALUES[task.type] ?? 0;
}

export function totalXpForTasks(tasks) {
  return tasks.reduce((s, t) => s + xpForTask(t), 0);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/lib/xp.js tests/lib/xp.test.js
git commit -m "feat(lib): xp values and totals"
```

---

### Task 5: Level math

**Files:**
- Create: `js/lib/level.js`
- Test: `tests/lib/level.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/level.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { levelForTotalXp, xpToNextLevel } from '../../js/lib/level.js';

describe('levelForTotalXp', () => {
  it('starts at 0', () => { expect(levelForTotalXp(0)).toBe(0); });
  it('uses floor(sqrt(xp/50))', () => {
    expect(levelForTotalXp(50)).toBe(1);
    expect(levelForTotalXp(200)).toBe(2);
    expect(levelForTotalXp(450)).toBe(3);
    expect(levelForTotalXp(800)).toBe(4);
  });
  it('handles non-multiples', () => {
    expect(levelForTotalXp(199)).toBe(1);
    expect(levelForTotalXp(449)).toBe(2);
  });
});

describe('xpToNextLevel', () => {
  it('returns gap to next threshold', () => {
    expect(xpToNextLevel(0)).toBe(50);
    expect(xpToNextLevel(50)).toBe(150);
    expect(xpToNextLevel(200)).toBe(250);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `js/lib/level.js`**

```javascript
export function levelForTotalXp(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 50));
}

export function xpToNextLevel(totalXp) {
  const lvl = levelForTotalXp(totalXp);
  return (lvl + 1) ** 2 * 50 - totalXp;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/lib/level.js tests/lib/level.test.js
git commit -m "feat(lib): level + xp-to-next math"
```

---

### Task 6: Streak with rest-day forgiveness

**Files:**
- Create: `js/lib/streak.js`
- Test: `tests/lib/streak.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/streak.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { computeStreak } from '../../js/lib/streak.js';

describe('computeStreak', () => {
  it('returns 0 for empty', () => {
    expect(computeStreak([], '2026-05-24')).toEqual({ streak: 0, restDayUsedThisWeek: false });
  });

  it('counts consecutive boss days backwards', () => {
    const h = [
      { date: '2026-05-22', bossesCompleted: 1 },
      { date: '2026-05-23', bossesCompleted: 2 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    expect(computeStreak(h, '2026-05-24')).toEqual({ streak: 3, restDayUsedThisWeek: false });
  });

  it('uses rest day to bridge a zero-boss day', () => {
    const h = [
      { date: '2026-05-22', bossesCompleted: 1 },
      { date: '2026-05-23', bossesCompleted: 0 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    expect(computeStreak(h, '2026-05-24')).toEqual({ streak: 3, restDayUsedThisWeek: true });
  });

  it('breaks on second zero day in the same week', () => {
    const h = [
      { date: '2026-05-19', bossesCompleted: 1 },
      { date: '2026-05-20', bossesCompleted: 0 },
      { date: '2026-05-21', bossesCompleted: 1 },
      { date: '2026-05-22', bossesCompleted: 0 },
      { date: '2026-05-23', bossesCompleted: 1 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    expect(computeStreak(h, '2026-05-24')).toEqual({ streak: 2, restDayUsedThisWeek: true });
  });

  it('treats missing days as zero-boss', () => {
    const h = [
      { date: '2026-05-22', bossesCompleted: 1 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    expect(computeStreak(h, '2026-05-24')).toEqual({ streak: 3, restDayUsedThisWeek: true });
  });

  it('returns 0 if today is zero and rest day spent', () => {
    const h = [
      { date: '2026-05-19', bossesCompleted: 0 },
      { date: '2026-05-20', bossesCompleted: 1 },
      { date: '2026-05-24', bossesCompleted: 0 }
    ];
    expect(computeStreak(h, '2026-05-24')).toEqual({ streak: 0, restDayUsedThisWeek: true });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `js/lib/streak.js`**

```javascript
import { addDays, isoWeekStart } from './dates.js';

export function computeStreak(history, today) {
  const byDate = new Map(history.map(h => [h.date, h.bossesCompleted]));
  const thisWeekStart = isoWeekStart(today);

  let restDayUsedThisWeek = false;
  for (const { date, bossesCompleted } of history) {
    if (isoWeekStart(date) === thisWeekStart && bossesCompleted === 0) {
      restDayUsedThisWeek = true;
      break;
    }
  }

  let streak = 0;
  let cursor = today;
  let restAvailable = !restDayUsedThisWeek;
  let currentWeek = isoWeekStart(today);

  while (streak <= 365) {
    const cursorWeek = isoWeekStart(cursor);
    if (cursorWeek !== currentWeek) {
      restAvailable = true;
      currentWeek = cursorWeek;
    }
    const bosses = byDate.get(cursor) ?? 0;
    if (bosses > 0) {
      streak++;
    } else if (restAvailable) {
      streak++;
      restAvailable = false;
    } else {
      break;
    }
    cursor = addDays(cursor, -1);
  }

  return { streak, restDayUsedThisWeek };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/lib/streak.js tests/lib/streak.test.js
git commit -m "feat(lib): boss-kill streak with weekly rest-day forgiveness"
```

---

### Task 7: Day aggregation

**Files:**
- Create: `js/lib/aggregate.js`
- Test: `tests/lib/aggregate.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/aggregate.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { summarizeDay, groupByBlock } from '../../js/lib/aggregate.js';

describe('summarizeDay', () => {
  it('zero for empty', () => {
    expect(summarizeDay([])).toEqual({ totalXp: 0, bossesCompleted: 0, bossesPlanned: 0, completionStatus: 'missed' });
  });

  it('counts bosses and xp', () => {
    const r = summarizeDay([
      { type: 'power_up', done: true },
      { type: 'yolo', done: true },
      { type: 'boss', done: true },
      { type: 'boss', done: false }
    ]);
    expect(r.totalXp).toBe(80);
    expect(r.bossesCompleted).toBe(1);
    expect(r.bossesPlanned).toBe(2);
    expect(r.completionStatus).toBe('partial');
  });

  it('reports all-bosses', () => {
    expect(summarizeDay([{ type: 'boss', done: true }, { type: 'boss', done: true }]).completionStatus).toBe('all-bosses');
  });

  it('reports missed when bosses planned, none done', () => {
    expect(summarizeDay([{ type: 'boss', done: false }]).completionStatus).toBe('missed');
  });
});

describe('groupByBlock', () => {
  it('groups by block ascending', () => {
    const tasks = [
      { id: 'a', block: 2, blockTitle: 'Afternoon', energy: '🙂', order: 0 },
      { id: 'b', block: 1, blockTitle: 'Morning', energy: '😐', order: 0 },
      { id: 'c', block: 1, blockTitle: 'Morning', energy: '😐', order: 1 }
    ];
    const g = groupByBlock(tasks);
    expect(g.length).toBe(2);
    expect(g[0].blockIndex).toBe(1);
    expect(g[0].tasks.map(t => t.id)).toEqual(['b', 'c']);
  });

  it('sorts tasks by order', () => {
    const tasks = [
      { id: 'a', block: 1, blockTitle: 'M', energy: '', order: 2 },
      { id: 'b', block: 1, blockTitle: 'M', energy: '', order: 0 },
      { id: 'c', block: 1, blockTitle: 'M', energy: '', order: 1 }
    ];
    expect(groupByBlock(tasks)[0].tasks.map(t => t.id)).toEqual(['b', 'c', 'a']);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `js/lib/aggregate.js`**

```javascript
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
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/lib/aggregate.js tests/lib/aggregate.test.js
git commit -m "feat(lib): day summary + group-by-block"
```

---

## Phase 3 — Storage layer

### Task 8: localStorage-backed storage module

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

The interface is the same one a future Notion+Vercel backend would expose, so a v2 swap rewrites only this file:
- `loadDay(date)` → array of tasks for that date
- `loadHistory(days)` → tasks within the last N days
- `createTasks(tasks)` → assigns UUIDs, stores, returns the created task array with IDs
- `updateTask(id, patch)` → applies partial update, returns updated task
- `deleteTask(id)` → removes
- `exportAll()` → returns the JSON blob (for backup)
- `importAll(blob)` → replaces all data (for restore)
- `clearAll()` → wipes
- `getSettings()` / `setSetting(key, value)` → settings persistence

All functions are synchronous (localStorage is sync), but each one returns a Promise so the interface matches a future async backend.

- [ ] **Step 1: Write failing tests**

`tests/storage.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDay, loadHistory, createTasks, updateTask, deleteTask, exportAll, importAll, clearAll, getSettings, setSetting } from '../js/storage.js';

beforeEach(() => {
  localStorage.clear();
});

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
    // Use a fixed today: today is whatever Date.now() resolves to. Just create tasks dated today.
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
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `js/storage.js`**

```javascript
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
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS, all storage tests.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat(storage): localStorage-backed storage with export/import"
```

---

## Phase 4 — Frontend shell

### Task 9: HTML + global CSS

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Timetable</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23111'/%3E%3Ctext x='50' y='70' font-family='Georgia,serif' font-size='62' font-weight='900' text-anchor='middle' fill='%23f5b800'%3ET%3C/text%3E%3C/svg%3E" />
</head>
<body>
  <header class="topbar">
    <div class="topbar-left">
      <span class="level-badge" id="level-badge">Lv 0</span>
      <span class="streak" id="streak">🔥 0</span>
    </div>
    <div class="topbar-right">
      <button class="icon-btn" id="btn-history" aria-label="History">📅</button>
      <button class="icon-btn" id="btn-settings" aria-label="Settings">⚙</button>
    </div>
  </header>
  <div class="xp-bar"><div class="xp-fill" id="xp-fill"></div><span class="xp-text" id="xp-text">0 XP</span></div>

  <main id="day-view"></main>

  <div class="fab-container">
    <button class="fab" id="btn-plan-tomorrow">+ Plan tomorrow</button>
  </div>

  <div class="drawer" id="drawer-plan"     hidden></div>
  <div class="drawer" id="drawer-history"  hidden></div>
  <div class="drawer" id="drawer-settings" hidden></div>

  <div id="effects-layer" aria-hidden="true"></div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/styles.css`**

```css
:root {
  --bg: #0e0f12;
  --surface: #16181d;
  --surface-2: #1d2027;
  --text: #f0f1f4;
  --text-dim: #8a8f9c;
  --accent: #f5b800;
  --boss: #f5b800;
  --green: #4ad27a;
  --red: #f25b5b;
  --blue: #5b9df2;
  --radius: 12px;
  --shadow: 0 2px 8px rgba(0,0,0,0.4);
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
button { font-family: inherit; cursor: pointer; }
input, textarea { font-family: inherit; }

.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; position: sticky; top: 0; z-index: 10;
  background: var(--bg); border-bottom: 1px solid var(--surface-2);
}
.topbar-left, .topbar-right { display: flex; gap: 12px; align-items: center; }
.level-badge { font-family: var(--font-display); font-weight: 700; font-size: 18px; }
.streak { font-size: 15px; }
.icon-btn { background: transparent; border: none; color: var(--text); font-size: 18px; padding: 6px 8px; border-radius: 8px; }
.icon-btn:hover { background: var(--surface-2); }

.xp-bar {
  position: relative; height: 8px; background: var(--surface-2); margin: 0 18px;
  border-radius: 999px; overflow: hidden;
}
.xp-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--accent), #ffd45a);
  transition: width 400ms cubic-bezier(.25,.1,.25,1);
}
.xp-text {
  position: absolute; right: 0; top: 12px; font-size: 11px; color: var(--text-dim);
}

main {
  max-width: 720px; margin: 24px auto 100px; padding: 0 18px;
  display: flex; flex-direction: column; gap: 18px;
}

.empty-state {
  text-align: center; color: var(--text-dim); padding: 40px 20px;
  font-family: var(--font-display); font-size: 18px;
}

.block-card {
  background: var(--surface); border-radius: var(--radius); padding: 16px;
  box-shadow: var(--shadow);
}
.block-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.block-title { font-family: var(--font-display); font-weight: 700; font-size: 22px; }
.energy-picker { display: flex; gap: 6px; }
.energy-picker button {
  background: transparent; border: 1px solid var(--surface-2); color: var(--text);
  width: 32px; height: 32px; border-radius: 50%; font-size: 14px; padding: 0;
}
.energy-picker button.selected { background: var(--surface-2); border-color: var(--accent); }

.task-row {
  display: flex; gap: 12px; align-items: flex-start; padding: 10px 4px;
  border-radius: 8px; cursor: pointer; user-select: none;
}
.task-row:hover { background: var(--surface-2); }
.task-row.done .task-title { color: var(--text-dim); text-decoration: line-through; }
.task-row.boss { border-left: 3px solid var(--boss); padding-left: 10px; }
.task-checkbox {
  width: 22px; height: 22px; border: 2px solid var(--text-dim); border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  margin-top: 2px; font-size: 13px; line-height: 1;
}
.task-row.done .task-checkbox { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.task-row.boss.done .task-checkbox { background: var(--boss); }
.task-content { flex: 1; }
.task-title { font-weight: 500; }
.task-row.boss .task-title { color: var(--boss); font-weight: 600; }
.task-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; white-space: pre-line; }
.task-meta { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

.fab-container {
  position: fixed; bottom: 0; left: 0; right: 0; padding: 16px;
  display: flex; justify-content: center; z-index: 5;
  background: linear-gradient(180deg, transparent, var(--bg) 50%);
  pointer-events: none;
}
.fab {
  background: var(--accent); color: var(--bg); font-weight: 600;
  padding: 14px 24px; border: none; border-radius: 999px; font-size: 15px;
  box-shadow: 0 4px 12px rgba(245,184,0,0.3);
  pointer-events: auto;
}

.drawer {
  position: fixed; left: 0; right: 0; bottom: 0; max-height: 90vh;
  background: var(--surface); border-radius: var(--radius) var(--radius) 0 0;
  padding: 20px; overflow-y: auto; z-index: 30;
  box-shadow: 0 -8px 24px rgba(0,0,0,0.5);
  transform: translateY(100%); transition: transform 280ms cubic-bezier(.25,.1,.25,1);
}
.drawer.open { transform: translateY(0); }
.drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 20;
  opacity: 0; transition: opacity 280ms;
}
.drawer-backdrop.open { opacity: 1; }

#effects-layer {
  position: fixed; inset: 0; pointer-events: none; z-index: 50; overflow: hidden;
}
.xp-popup {
  position: absolute; font-family: var(--font-display); font-weight: 700; font-size: 28px;
  color: var(--accent); animation: xp-float 900ms ease-out forwards;
}
.xp-popup.boss { font-size: 40px; color: var(--boss); }
@keyframes xp-float {
  0%   { opacity: 0; transform: translateY(0); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-80px); }
}

.toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  background: var(--surface-2); padding: 10px 16px; border-radius: 999px;
  font-size: 14px; z-index: 60; box-shadow: var(--shadow);
  max-width: 90%; text-align: center;
}

@media (max-width: 600px) {
  .topbar { padding: 12px 14px; }
  main { padding: 0 14px; margin-top: 16px; }
}
```

- [ ] **Step 3: Smoke-test**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: page loads with top bar (Lv 0, 🔥 0), empty XP bar, empty day area, "+ Plan tomorrow" button at bottom. No JS errors in console.

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat(ui): HTML shell + global CSS"
```

---

### Task 10: Effects module

**Files:**
- Create: `js/ui/effects.js`

- [ ] **Step 1: Implement `js/ui/effects.js`**

```javascript
import { getSettings, setSetting } from '../storage.js';

let confettiFn = null;
async function getConfetti() {
  if (confettiFn) return confettiFn;
  const mod = await import('https://cdn.skypack.dev/canvas-confetti');
  confettiFn = mod.default;
  return confettiFn;
}

let audioCtx = null;
function getAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

let _soundEnabled = true;
export async function loadSoundPref() {
  const s = await getSettings();
  _soundEnabled = s.soundEnabled !== false;
}
export function isSoundEnabled() { return _soundEnabled; }
export async function setSoundEnabled(v) {
  _soundEnabled = !!v;
  await setSetting('soundEnabled', _soundEnabled);
}

function tone(freq, duration = 0.1, type = 'sine', volume = 0.15) {
  if (!_soundEnabled) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playTick() { tone(880, 0.08, 'triangle', 0.12); }
export function playBossKill() {
  tone(440, 0.18, 'sawtooth', 0.18);
  setTimeout(() => tone(660, 0.18, 'sawtooth', 0.18), 90);
  setTimeout(() => tone(880, 0.32, 'sawtooth', 0.18), 180);
}

export function xpPopup({ x, y, amount, kind = 'normal' }) {
  const layer = document.getElementById('effects-layer');
  const el = document.createElement('div');
  el.className = 'xp-popup' + (kind === 'boss' ? ' boss' : '');
  el.textContent = `+${amount} XP`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export async function confettiBurst({ x, y, big = false } = {}) {
  const fn = await getConfetti();
  fn({
    particleCount: big ? 100 : 40,
    spread: big ? 90 : 60,
    origin: {
      x: (x ?? window.innerWidth / 2) / window.innerWidth,
      y: (y ?? window.innerHeight / 2) / window.innerHeight
    },
    colors: big ? ['#f5b800', '#ffd45a', '#fff', '#5b9df2'] : ['#f5b800', '#ffd45a']
  });
}

export function showBossBanner() {
  const layer = document.getElementById('effects-layer');
  const el = document.createElement('div');
  el.textContent = 'BOSS DEFEATED';
  el.style.cssText = `
    position: absolute; top: 25%; left: 50%; transform: translate(-50%, 0);
    font-family: 'Fraunces', serif; font-size: 48px; font-weight: 700;
    color: #f5b800; text-shadow: 0 4px 24px rgba(245,184,0,0.6);
    animation: boss-banner 1400ms ease-out forwards;
  `;
  if (!document.getElementById('boss-banner-style')) {
    const s = document.createElement('style');
    s.id = 'boss-banner-style';
    s.textContent = `@keyframes boss-banner {
      0% { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
      30% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -20px) scale(1); }
    }`;
    document.head.appendChild(s);
  }
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

const LOOT_MESSAGES = [
  "You showed up. That counts.",
  "Future you is cheering.",
  "Small wins compound.",
  "The hard part was starting. You did it.",
  "This is exactly how progress feels.",
  "Inertia broken.",
  "ADHD brain just won a round.",
  "You're allowed to be proud of this.",
  "Momentum unlocked.",
  "One more, then one more.",
  "Dopamine drop — well earned.",
  "Boss music intensifies.",
  "The streak likes you.",
  "Past-you set this up. Thank them.",
  "Done > perfect.",
  "Power up acquired: focus +1.",
  "You can't undo this win.",
  "The list got shorter.",
  "Your brain is learning what 'done' feels like.",
  "Tiny victory, real victory.",
  "You're outrunning the executive dysfunction.",
  "Tomorrow-you will not regret this.",
  "Caps lock: NICE.",
  "Tasks fear you slightly more now.",
  "The Boss can't hide forever.",
  "Stack one more.",
  "Time is moving — so are you.",
  "Done is a feeling. Memorize it.",
  "A check mark is also a deposit.",
  "You earned a stretch."
];

let checkOffCount = 0;
export function showLootIfDue() {
  checkOffCount++;
  if (checkOffCount % 5 !== 0) return;
  const msg = LOOT_MESSAGES[Math.floor(Math.random() * LOOT_MESSAGES.length)];
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = '✨ ' + msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/effects.js
git commit -m "feat(ui): effects — confetti, xp popup, sounds, loot drops, toast"
```

---

### Task 11: Top-bar render

**Files:**
- Create: `js/ui/topbar.js`

- [ ] **Step 1: Implement `js/ui/topbar.js`**

```javascript
import { levelForTotalXp, xpToNextLevel } from '../lib/level.js';

export function renderTopbar({ totalLifetimeXp, todayXp, streak }) {
  const level = levelForTotalXp(totalLifetimeXp);
  const toNext = xpToNextLevel(totalLifetimeXp);
  const pct = (toNext + todayXp) === 0 ? 0 : Math.min(100, (todayXp / Math.max(todayXp + toNext, 1)) * 100);

  document.getElementById('level-badge').textContent = `Lv ${level}`;
  document.getElementById('streak').textContent = `🔥 ${streak}`;
  document.getElementById('xp-fill').style.width = `${pct}%`;
  document.getElementById('xp-text').textContent = `${todayXp} XP today`;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/topbar.js
git commit -m "feat(ui): top-bar render"
```

---

### Task 12: Day view rendering

**Files:**
- Create: `js/ui/day.js`

- [ ] **Step 1: Implement `js/ui/day.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/day.js
git commit -m "feat(ui): day view rendering"
```

---

### Task 13: Drawer base component

**Files:**
- Create: `js/ui/drawer.js`

- [ ] **Step 1: Implement `js/ui/drawer.js`**

```javascript
export function openDrawer(drawerEl, contentBuilder) {
  drawerEl.innerHTML = '';
  contentBuilder(drawerEl);
  drawerEl.hidden = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => {
    drawerEl.classList.add('open');
    backdrop.classList.add('open');
  });

  function close() {
    drawerEl.classList.remove('open');
    backdrop.classList.remove('open');
    setTimeout(() => {
      drawerEl.hidden = true;
      backdrop.remove();
    }, 280);
  }
  backdrop.addEventListener('click', close);
  drawerEl._close = close;
  return close;
}

export function closeDrawer(drawerEl) {
  drawerEl._close?.();
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui/drawer.js
git commit -m "feat(ui): generic slide-up drawer"
```

---

## Phase 5 — Orchestration

### Task 14: app.js — load, render, check-off, energy

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Implement `js/app.js`** (drawers wired in later tasks)

```javascript
import { todayISO, addDays } from './lib/dates.js';
import { summarizeDay } from './lib/aggregate.js';
import { computeStreak } from './lib/streak.js';
import { XP_VALUES, xpForTask } from './lib/xp.js';
import { loadDay, loadHistory, updateTask } from './storage.js';
import { renderTopbar } from './ui/topbar.js';
import { renderDay, onTaskToggle, onEnergyPick } from './ui/day.js';
import {
  confettiBurst, xpPopup, playTick, playBossKill, showBossBanner, showLootIfDue, toast, loadSoundPref
} from './ui/effects.js';

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
    // Refresh history in background so lifetime XP and streak update
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

(async function init() {
  await loadSoundPref();
  await refresh();
})();
```

- [ ] **Step 2: Manual browser test**

Run: `npm run dev`
Expected:
- Site loads cleanly. No console errors.
- Empty state shows ("No plan for today. Tap '+ Plan tomorrow' to start.")
- Top bar shows Lv 0, 🔥 0, 0 XP today.

(Can't fully test check-off until we have tasks, which requires the plan drawer in Task 16.)

- [ ] **Step 3: Manually create one task in localStorage to test check-off**

In browser devtools console:

```javascript
localStorage.setItem('timetable.data', JSON.stringify({
  tasks: [
    { id: 'test1', date: new Date().toISOString().slice(0,10), block: 1, blockTitle: 'Morning', type: 'boss', title: 'Test boss', description: '', minMins: 45, order: 0, done: false, completedAt: null, energy: '' }
  ],
  settings: { soundEnabled: true }
}));
location.reload();
```

Expected: Morning block appears with a boss task. Tap it → confetti, +50 XP popup, boss banner, gold check, XP bar fills. Reload → still done.

- [ ] **Step 4: Wipe test data and commit**

In console: `localStorage.removeItem('timetable.data'); location.reload();`

```bash
git add js/app.js
git commit -m "feat(ui): app.js orchestration — load, render, check-off, energy"
```

---

## Phase 6 — Plan-tomorrow drawer

### Task 15: Plan-tomorrow drawer

**Files:**
- Create: `js/ui/plan-drawer.js`
- Modify: `js/app.js` (wire up the "+ Plan tomorrow" button)

- [ ] **Step 1: Implement `js/ui/plan-drawer.js`**

```javascript
export function buildPlanDrawer({ skeleton, targetDate, onSave, onCancel }) {
  return (root) => {
    root.style.maxHeight = '90vh';
    const h = document.createElement('h2');
    h.textContent = `Plan for ${targetDate}`;
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    const blocksContainer = document.createElement('div');
    root.appendChild(blocksContainer);

    const state = { blocks: skeleton.length > 0 ? structuredClone(skeleton) : [defaultBlock(1)] };

    function rerender() {
      blocksContainer.innerHTML = '';
      state.blocks.forEach((b, idx) => blocksContainer.appendChild(renderBlock(b, idx, state, rerender)));
    }
    rerender();

    const addBlockBtn = document.createElement('button');
    addBlockBtn.textContent = '+ Add block';
    addBlockBtn.style.cssText = 'margin-top:12px; background:transparent; color:var(--accent); border:1px dashed var(--accent); padding:10px; border-radius:8px; width:100%;';
    addBlockBtn.addEventListener('click', () => {
      if (state.blocks.length >= 5) return;
      state.blocks.push(defaultBlock(state.blocks.length + 1));
      rerender();
    });
    root.appendChild(addBlockBtn);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:10px; margin-top:18px;';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'flex:1; background:transparent; color:var(--text); border:1px solid var(--surface-2); padding:12px; border-radius:8px;';
    cancel.addEventListener('click', onCancel);
    const save = document.createElement('button');
    save.textContent = 'Save plan';
    save.style.cssText = 'flex:2; background:var(--accent); color:var(--bg); border:none; padding:12px; border-radius:8px; font-weight:600;';
    save.addEventListener('click', () => onSave(blocksToTasks(state.blocks, targetDate)));
    actions.append(cancel, save);
    root.appendChild(actions);
  };
}

function defaultBlock(idx) {
  const titles = ['Morning', 'Afternoon', 'Evening', 'Late night', 'Block 5'];
  return {
    blockIndex: idx,
    blockTitle: titles[idx - 1] ?? `Block ${idx}`,
    powerUp:  { title: 'Power Up', description: '1. Eat\n2. Call\n3. Text' },
    yolo:     { title: 'Yolo task', minMins: 30 },
    regulars: [],
    boss:     { title: '', minMins: 45 }
  };
}

function renderBlock(b, idx, state, rerender) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-2); padding:14px; border-radius:10px; margin-bottom:12px;';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;';
  const t = document.createElement('input');
  t.value = b.blockTitle;
  t.style.cssText = 'background:transparent; border:none; color:var(--text); font-family:var(--font-display); font-size:18px; font-weight:700; flex:1;';
  t.addEventListener('input', () => { b.blockTitle = t.value; });
  titleRow.appendChild(t);
  if (state.blocks.length > 1) {
    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.style.cssText = 'background:transparent; color:var(--text-dim); border:none; font-size:20px;';
    rm.addEventListener('click', () => { state.blocks.splice(idx, 1); rerender(); });
    titleRow.appendChild(rm);
  }
  card.appendChild(titleRow);

  card.appendChild(makeField('Power Up title', b.powerUp.title, v => b.powerUp.title = v));
  card.appendChild(makeTextarea('Power Up sub-items', b.powerUp.description, v => b.powerUp.description = v));
  card.appendChild(makeFieldPair('Yolo title', b.yolo.title, v => b.yolo.title = v, 'Min', b.yolo.minMins, v => b.yolo.minMins = Number(v) || null));

  const regHeader = document.createElement('div');
  regHeader.textContent = 'Other tasks';
  regHeader.style.cssText = 'font-size:13px; color:var(--text-dim); margin:10px 0 4px;';
  card.appendChild(regHeader);
  b.regulars.forEach((r, ri) => {
    card.appendChild(makeFieldPairWithRemove(
      'Title', r.title, v => r.title = v,
      'Min', r.minMins ?? 0, v => r.minMins = Number(v) || null,
      () => { b.regulars.splice(ri, 1); rerender(); }
    ));
  });
  const addReg = document.createElement('button');
  addReg.textContent = '+ Add task';
  addReg.style.cssText = 'background:transparent; color:var(--text-dim); border:1px dashed var(--surface); padding:6px; border-radius:6px; width:100%; font-size:13px; margin-top:4px;';
  addReg.addEventListener('click', () => { b.regulars.push({ title: '', minMins: 45 }); rerender(); });
  card.appendChild(addReg);

  card.appendChild(makeFieldPair('⚔ Boss title', b.boss.title, v => b.boss.title = v, 'Min', b.boss.minMins, v => b.boss.minMins = Number(v) || null));

  return card;
}

function makeField(label, value, onChange) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin: 6px 0;';
  const l = document.createElement('div'); l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('input'); i.value = value ?? '';
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i); return wrap;
}

function makeTextarea(label, value, onChange) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin:6px 0;';
  const l = document.createElement('div'); l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('textarea'); i.value = value ?? ''; i.rows = 3;
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px; resize:vertical;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i); return wrap;
}

function makeFieldPair(l1, v1, on1, l2, v2, on2) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex; gap:8px; margin:6px 0;';
  const m = makeField(l1, v1, on1); m.style.flex = '3';
  const n = makeField(l2, v2, on2); n.style.flex = '1';
  wrap.append(m, n); return wrap;
}

function makeFieldPairWithRemove(l1, v1, on1, l2, v2, on2, onRemove) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex; gap:6px; align-items:flex-end; margin:4px 0;';
  const m = makeField(l1, v1, on1); m.style.flex = '3';
  const n = makeField(l2, v2, on2); n.style.flex = '1';
  const rm = document.createElement('button'); rm.textContent = '×';
  rm.style.cssText = 'background:transparent; color:var(--text-dim); border:none; font-size:20px; padding:0 6px;';
  rm.addEventListener('click', onRemove);
  wrap.append(m, n, rm); return wrap;
}

function blocksToTasks(blocks, date) {
  const out = [];
  for (const b of blocks) {
    let order = 0;
    if (b.powerUp.title) {
      out.push({ title: b.powerUp.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'power_up', description: b.powerUp.description ?? '', minMins: null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
    if (b.yolo.title) {
      out.push({ title: b.yolo.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'yolo', description: '', minMins: b.yolo.minMins || null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
    for (const r of b.regulars) {
      if (!r.title) continue;
      out.push({ title: r.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'regular', description: '', minMins: r.minMins || null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
    if (b.boss.title) {
      out.push({ title: b.boss.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'boss', description: '', minMins: b.boss.minMins || null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
  }
  return out;
}

export function tasksToSkeleton(tasks) {
  const byBlock = new Map();
  for (const t of tasks) {
    if (!byBlock.has(t.block)) byBlock.set(t.block, {
      blockIndex: t.block, blockTitle: t.blockTitle || `Block ${t.block}`,
      powerUp: { title: '', description: '' },
      yolo: { title: '', minMins: 30 },
      regulars: [],
      boss: { title: '', minMins: 45 }
    });
    const b = byBlock.get(t.block);
    if (t.type === 'power_up') { b.powerUp.title = t.title; b.powerUp.description = t.description; }
    else if (t.type === 'yolo') { b.yolo.title = t.title; b.yolo.minMins = t.minMins ?? 30; }
    else if (t.type === 'boss') { b.boss.minMins = t.minMins ?? 45; /* boss title NOT carried — daily */ }
    // regulars NOT carried — daily
  }
  return [...byBlock.values()].sort((a, b) => a.blockIndex - b.blockIndex);
}
```

- [ ] **Step 2: Wire up in `js/app.js`** — append after the IIFE:

```javascript
import { openDrawer, closeDrawer } from './ui/drawer.js';
import { buildPlanDrawer, tasksToSkeleton } from './ui/plan-drawer.js';
import { createTasks } from './storage.js';

document.getElementById('btn-plan-tomorrow').addEventListener('click', async () => {
  const tomorrow = addDays(state.date, 1);
  const todayTasks = await loadDay(state.date);
  const skeleton = tasksToSkeleton(todayTasks);
  const drawer = document.getElementById('drawer-plan');
  openDrawer(drawer, buildPlanDrawer({
    skeleton,
    targetDate: tomorrow,
    onCancel: () => closeDrawer(drawer),
    onSave: async (newTasks) => {
      try {
        await createTasks(newTasks);
        closeDrawer(drawer);
        toast(`Plan saved for ${tomorrow}.`);
      } catch (e) {
        toast(`Save failed: ${e.message}`);
      }
    }
  }));
});
```

- [ ] **Step 3: Manual browser test**

Run: `npm run dev`
- Tap "+ Plan tomorrow".
- Drawer slides up. Default skeleton with Morning block + Power Up sub-items prefilled.
- Add a block. Edit titles. Add a boss. Save.
- Re-open dev tools → check localStorage `timetable.data` → tomorrow's tasks are present.
- Reload site. Today's view still empty. Manually change today's date in app state OR re-open the drawer and inspect.

To verify the data more directly, in console:
```javascript
JSON.parse(localStorage.getItem('timetable.data')).tasks
```
Should include the new tasks dated tomorrow.

- [ ] **Step 4: Commit**

```bash
git add js/ui/plan-drawer.js js/app.js
git commit -m "feat(ui): night-planning drawer with template"
```

---

## Phase 7 — History view

### Task 16: History calendar drawer

**Files:**
- Create: `js/ui/history.js`
- Modify: `js/app.js`

- [ ] **Step 1: Implement `js/ui/history.js`**

```javascript
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
      if (date > today) cell.style.opacity = '0.4';
      cell.style.background = bg;
      cell.style.color = color;
      cell.addEventListener('click', () => onPickDate(date, tasks));
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

    const detail = document.createElement('div');
    detail.id = 'history-detail';
    detail.style.cssText = 'margin-top:14px; padding-top:14px; border-top:1px solid var(--surface-2);';
    root.appendChild(detail);

    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'margin-top:14px; width:100%; padding:12px; background:transparent; color:var(--text); border:1px solid var(--surface-2); border-radius:8px;';
    close.addEventListener('click', onClose);
    root.appendChild(close);
  };
}

export function renderHistoryDetail(date, tasks) {
  const root = document.getElementById('history-detail');
  if (!root) return;
  root.innerHTML = '';
  const h = document.createElement('div');
  h.textContent = date;
  h.style.cssText = 'font-family:var(--font-display); font-weight:700; margin-bottom:8px;';
  root.appendChild(h);
  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'No plan for this day.';
    empty.style.cssText = 'color:var(--text-dim); font-size:13px;';
    root.appendChild(empty);
    return;
  }
  for (const t of [...tasks].sort((a, b) => (a.block - b.block) || (a.order - b.order))) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; font-size:13px; padding:4px 0; color:' + (t.done ? 'var(--text-dim)' : 'var(--text)');
    row.innerHTML = `<span>${t.done ? '✓' : '○'}</span><span>${t.blockTitle}</span><span>${t.type === 'boss' ? '⚔ ' : ''}${t.title}</span>`;
    root.appendChild(row);
  }
}
```

- [ ] **Step 2: Wire up in `js/app.js`** — append:

```javascript
import { buildHistoryDrawer, renderHistoryDetail } from './ui/history.js';

document.getElementById('btn-history').addEventListener('click', () => {
  const drawer = document.getElementById('drawer-history');
  openDrawer(drawer, buildHistoryDrawer({
    history: state.history,
    onClose: () => closeDrawer(drawer),
    onPickDate: (date, tasks) => renderHistoryDetail(date, tasks)
  }));
});
```

- [ ] **Step 3: Manual browser test**

Run: `npm run dev`
- Tap 📅.
- Calendar opens. Today is outlined. Past days from your test plans are colored.
- Click a past day → its tasks render below.

- [ ] **Step 4: Commit**

```bash
git add js/ui/history.js js/app.js
git commit -m "feat(ui): history calendar drawer"
```

---

## Phase 8 — Settings + export/import

### Task 17: Settings drawer

**Files:**
- Create: `js/ui/settings.js`
- Modify: `js/app.js`

- [ ] **Step 1: Implement `js/ui/settings.js`**

```javascript
import { isSoundEnabled, setSoundEnabled } from './effects.js';
import { exportAll, importAll, clearAll } from '../storage.js';

export function buildSettingsDrawer({ onClose, onDataChanged }) {
  return (root) => {
    const h = document.createElement('h2');
    h.textContent = 'Settings';
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    // Sound
    const soundRow = document.createElement('label');
    soundRow.style.cssText = 'display:flex; justify-content:space-between; padding:10px 0; align-items:center;';
    const soundLabel = document.createElement('span'); soundLabel.textContent = 'Sound effects';
    const soundInput = document.createElement('input'); soundInput.type = 'checkbox';
    soundInput.checked = isSoundEnabled();
    soundInput.addEventListener('change', () => setSoundEnabled(soundInput.checked));
    soundRow.append(soundLabel, soundInput);
    root.appendChild(soundRow);

    // Export
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

    // Import
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

    // Clear all
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

    // Close
    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'margin-top:14px; width:100%; padding:12px; background:transparent; color:var(--text); border:1px solid var(--surface-2); border-radius:8px;';
    close.addEventListener('click', onClose);
    root.appendChild(close);
  };
}
```

- [ ] **Step 2: Wire up in `js/app.js`** — append:

```javascript
import { buildSettingsDrawer } from './ui/settings.js';

document.getElementById('btn-settings').addEventListener('click', () => {
  const drawer = document.getElementById('drawer-settings');
  openDrawer(drawer, buildSettingsDrawer({
    onClose: () => closeDrawer(drawer),
    onDataChanged: () => refresh()
  }));
});
```

- [ ] **Step 3: Manual browser test**

Run: `npm run dev`
- Tap ⚙.
- Toggle sound — verify a check-off no longer plays tones.
- Click "Download backup" — verify a JSON file downloads with your current tasks.
- Click "Clear all data" — confirm → state resets to empty.
- Re-import the backup file — tasks return.

- [ ] **Step 4: Commit**

```bash
git add js/ui/settings.js js/app.js
git commit -m "feat(ui): settings drawer — sound, export, import, clear"
```

---

## Phase 9 — Polish & ship

### Task 18: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# Timetable

ADHD-tuned gamified daily planner. Pure static site, all data lives in your browser.

## Daily use

1. Open the site.
2. Today's plan renders. Tap a task to check it off — confetti, XP, sounds.
3. Tap "+ Plan tomorrow" to fill in tomorrow's blocks. Today's structure is used as a template.
4. Tap 📅 for the calendar / history view.
5. Tap ⚙ for sound toggle and **backups** (recommended weekly).

## Important: back up your data

All data lives in your browser's localStorage. If you clear browser data, you lose everything. Solution:
- Settings → "Download backup" once a week. Save the JSON file somewhere safe.
- Settings → "Restore data" to import a backup file.

## Run locally

```bash
npm install
npm run dev
```

Opens http://localhost:3000.

## Tests

```bash
npm test
```

## Architecture

See `docs/superpowers/specs/2026-05-24-timetable-design.md`.

## Future: cloud sync

The `storage.js` module is the only file that talks to data. To add cross-device sync later (Notion + Vercel proxy), rewrite that one file. Architecture preserves the swap path. See spec → "Migration path".
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with daily use, backup, run, and architecture notes"
```

---

### Task 19: Final verification pass

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Full feature smoke test in browser**

Run: `npm run dev`. Walk through:
- [ ] Empty state shows on fresh load.
- [ ] "+ Plan tomorrow" creates a plan dated tomorrow. (Verify via export → see the date in JSON.)
- [ ] Manually create a plan for *today* by either: editing localStorage directly, or temporarily changing system date and using the plan drawer.
- [ ] Open today: blocks render with correct types and Boss row in gold.
- [ ] Tap each task type → check confetti + XP popup + sound.
- [ ] Tap Boss → boss banner + bigger confetti + boss sound.
- [ ] Every 5th check-off → loot drop toast appears.
- [ ] Energy emojis: tap one → it stays selected; reload → still selected.
- [ ] Top bar: level matches `floor(sqrt(lifetimeXP/50))`, streak shows expected value, XP bar fills.
- [ ] 📅 history: today is outlined, past days colored by status, click → detail renders.
- [ ] ⚙ settings: sound toggle, export, import, clear all — each verified.
- [ ] Mobile responsive (resize browser to phone width) — single column, tappable.

- [ ] **Step 3: Confirm with user before pushing to GitHub**

Pause here. Ask user: "Ready to push to a new GitHub repo? Public or private? Repo name (default: `timetable`)?"

- [ ] **Step 4: Push to GitHub**

```bash
# After user confirms — defaults below; substitute private/public + name as user chose
gh repo create timetable --private --source . --remote origin --push
```

- [ ] **Step 5: Enable GitHub Pages**

```bash
gh repo edit Prajje/timetable --enable-issues=true
gh api -X POST repos/Prajje/timetable/pages -f source[branch]=main -f source[path]=/ || true
```
Note: `gh api` for Pages may require additional setup; alternatively guide the user through GitHub UI: Settings → Pages → Source: main branch, root. After ~30 seconds the site is live at `https://prajje.github.io/timetable/`.

- [ ] **Step 6: Verify live site**

Open `https://prajje.github.io/timetable/` on phone and laptop. Verify it loads and works.

---

## Self-review notes

**Spec coverage check:**
- Tech stack (spec §"Tech stack") → Task 1.
- localStorage data model (spec §"Data model") → Task 8.
- Single-page Today UI (spec §"UI structure") → Tasks 9, 11, 12.
- Plan-tomorrow drawer (spec §"Night-fill template") → Task 15.
- History calendar (spec §"UI structure") → Task 16.
- Dopamine on check-off (spec §"Dopamine on check-off") → Task 10, used in Task 14.
- XP/Levels/Streak (spec §"Game mechanics") → Tasks 4, 5, 6, 11, 14.
- Energy check (spec §"Energy check") → Tasks 12, 14.
- Export/Import (spec §"Export / Import") → Tasks 8, 17.
- Out-of-scope (Notion, Vercel, timers, focus mode, multi-user, auth) → correctly omitted.

**Type consistency check:**
- Task shape unchanged across `storage.js`, `aggregate.js`, UI rendering: `{ id, title, date, block, blockTitle, type, description, minMins, order, done, completedAt, energy }`. Consistent.
- `groupByBlock` returns `{ blockIndex, blockTitle, energy, tasks }` — consumed by `renderDay` and `buildHistoryDrawer`. Consistent.
- `computeStreak` returns `{ streak, restDayUsedThisWeek }`. Consistent.

**Placeholder scan:** No TBDs. All code blocks complete and runnable.

**Decisions pinned in plan:**
- localStorage as a single JSON blob (simpler than per-day keys).
- All storage functions return Promises (interface compatible with future async backend).
- IDs via `crypto.randomUUID()` with a non-crypto fallback.
- Confetti lazy-loaded from skypack CDN (no bundler).
- Sound via Web Audio API tones (no audio files).

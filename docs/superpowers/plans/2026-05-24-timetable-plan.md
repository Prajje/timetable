# Timetable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an ADHD-tuned gamified daily planner served as a static site on Vercel with a Notion-backed proxy.

**Architecture:** Vanilla HTML/CSS/JS frontend served as static files from `public/`. A single Vercel serverless directory under `api/` proxies a Notion database, holding the Notion token server-side. Pure logic (XP, streak, dates, aggregation) lives in `public/js/lib/` and is imported by both frontend and serverless functions, so it's tested once and reused. State of truth = Notion DB; localStorage is a write-queue for offline check-offs.

**Tech Stack:**
- Node.js 20, ESM (`"type": "module"`)
- Vitest (unit tests, ~95% of testing) + jsdom (DOM tests)
- `@notionhq/client` (Notion API)
- `canvas-confetti` (visual effects, lazy-loaded)
- Vercel (hosting + serverless functions)
- Vanilla JS, no framework, no bundler

**File structure** (locked in):
```
timetable/
├── api/
│   ├── _helpers/
│   │   ├── auth.js          # Bearer-token check
│   │   └── notion.js        # Notion client wrapper + row<->task mapping
│   ├── day.js               # GET ?date=YYYY-MM-DD
│   ├── tasks.js             # POST  (batch create)
│   ├── history.js           # GET ?days=30
│   └── task/[id].js         # PATCH, DELETE
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js           # Entry, orchestration
│       ├── storage.js       # Proxy client + offline queue
│       ├── lib/             # Shared pure functions
│       │   ├── dates.js
│       │   ├── xp.js
│       │   ├── level.js
│       │   ├── streak.js
│       │   └── aggregate.js
│       └── ui/
│           ├── topbar.js
│           ├── day.js
│           ├── effects.js   # Confetti, XP popups, sounds
│           ├── drawer.js    # Night-planning drawer
│           ├── history.js
│           ├── settings.js
│           └── passphrase.js
├── tests/
│   ├── lib/{dates,xp,level,streak,aggregate}.test.js
│   └── api/{auth,day,tasks,task-id,history}.test.js
├── docs/superpowers/
│   ├── specs/2026-05-24-timetable-design.md
│   └── plans/2026-05-24-timetable-plan.md
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

**Convention for commit messages:** Conventional commits. `test:`, `feat:`, `fix:`, `chore:`, `docs:`.

---

## Phase 1 — Foundation

### Task 1: Initialize package.json, dependencies, scripts

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "timetable",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vercel dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "@notionhq/client": "^2.2.15"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "vercel": "^39.0.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.env
.env.local
.vercel/
coverage/
.DS_Store
```

- [ ] **Step 3: Create `.env.example`**

```
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_PASSPHRASE=change-me-to-a-real-secret
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: initialize package.json with vitest + vercel + notion"
```

---

### Task 2: Configure Vercel & Vitest

**Files:**
- Create: `vercel.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "version": 2,
  "public": false,
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/", "destination": "/public/index.html" },
    { "source": "/((?!api).*)", "destination": "/public/$1" }
  ]
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    environmentMatchGlobs: [
      ['tests/ui/**', 'jsdom']
    ]
  }
});
```

- [ ] **Step 3: Sanity-check vitest runs**

Run: `npm test`
Expected: "No test files found" (no error). This proves config parses.

- [ ] **Step 4: Commit**

```bash
git add vercel.json vitest.config.js
git commit -m "chore: configure vercel and vitest"
```

---

## Phase 2 — Pure logic (lib/)

All files in `public/js/lib/` are pure ESM modules with no DOM or network dependencies. Tested with Vitest.

### Task 3: Date utilities

**Files:**
- Create: `public/js/lib/dates.js`
- Test: `tests/lib/dates.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/dates.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { toISODate, addDays, isoWeekStart, isSameISOWeek, todayISO } from '../../public/js/lib/dates.js';

describe('toISODate', () => {
  it('formats a Date as YYYY-MM-DD using local time', () => {
    const d = new Date(2026, 4, 24); // May 24, 2026
    expect(toISODate(d)).toBe('2026-05-24');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('adds days to an ISO date string', () => {
    expect(addDays('2026-05-24', 1)).toBe('2026-05-25');
    expect(addDays('2026-05-24', -1)).toBe('2026-05-23');
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
  });
});

describe('isoWeekStart', () => {
  it('returns the Monday of the ISO week containing the given date', () => {
    // 2026-05-24 is a Sunday → week start is 2026-05-18 (Monday)
    expect(isoWeekStart('2026-05-24')).toBe('2026-05-18');
    // 2026-05-18 is itself a Monday
    expect(isoWeekStart('2026-05-18')).toBe('2026-05-18');
  });
});

describe('isSameISOWeek', () => {
  it('returns true for two dates in the same ISO week', () => {
    expect(isSameISOWeek('2026-05-18', '2026-05-24')).toBe(true);
  });
  it('returns false for dates in different ISO weeks', () => {
    expect(isSameISOWeek('2026-05-17', '2026-05-18')).toBe(false);
  });
});

describe('todayISO', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `public/js/lib/dates.js`**

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
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
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
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/dates.js tests/lib/dates.test.js
git commit -m "feat(lib): date utilities (toISODate, addDays, isoWeekStart)"
```

---

### Task 4: XP calculation

**Files:**
- Create: `public/js/lib/xp.js`
- Test: `tests/lib/xp.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/xp.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { xpForTask, totalXpForTasks, XP_VALUES } from '../../public/js/lib/xp.js';

describe('xpForTask', () => {
  it('returns 10 for yolo', () => {
    expect(xpForTask({ type: 'yolo', done: true })).toBe(10);
  });
  it('returns 20 for power_up', () => {
    expect(xpForTask({ type: 'power_up', done: true })).toBe(20);
  });
  it('returns 20 for regular', () => {
    expect(xpForTask({ type: 'regular', done: true })).toBe(20);
  });
  it('returns 50 for boss', () => {
    expect(xpForTask({ type: 'boss', done: true })).toBe(50);
  });
  it('returns 0 for incomplete task', () => {
    expect(xpForTask({ type: 'boss', done: false })).toBe(0);
  });
  it('returns 0 for unknown type', () => {
    expect(xpForTask({ type: 'mystery', done: true })).toBe(0);
  });
});

describe('totalXpForTasks', () => {
  it('sums xp across an array', () => {
    const tasks = [
      { type: 'power_up', done: true },
      { type: 'yolo', done: true },
      { type: 'boss', done: false },
      { type: 'regular', done: true }
    ];
    expect(totalXpForTasks(tasks)).toBe(20 + 10 + 0 + 20);
  });
  it('returns 0 for empty array', () => {
    expect(totalXpForTasks([])).toBe(0);
  });
});

describe('XP_VALUES', () => {
  it('exposes the value table', () => {
    expect(XP_VALUES.boss).toBe(50);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `public/js/lib/xp.js`**

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
  return tasks.reduce((sum, t) => sum + xpForTask(t), 0);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/xp.js tests/lib/xp.test.js
git commit -m "feat(lib): xp values + per-task and per-day calculation"
```

---

### Task 5: Level calculation

**Files:**
- Create: `public/js/lib/level.js`
- Test: `tests/lib/level.test.js`

- [ ] **Step 1: Write failing tests**

`tests/lib/level.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { levelForTotalXp, xpToNextLevel } from '../../public/js/lib/level.js';

describe('levelForTotalXp', () => {
  it('is 0 at 0 xp', () => {
    expect(levelForTotalXp(0)).toBe(0);
  });
  it('is floor(sqrt(xp/50))', () => {
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
  it('returns 50 from 0', () => {
    // level 0 → next at 50
    expect(xpToNextLevel(0)).toBe(50);
  });
  it('returns the gap to (level+1)^2 * 50', () => {
    expect(xpToNextLevel(50)).toBe(150);   // next at 200
    expect(xpToNextLevel(200)).toBe(250);  // next at 450
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `public/js/lib/level.js`**

```javascript
export function levelForTotalXp(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 50));
}

export function xpToNextLevel(totalXp) {
  const lvl = levelForTotalXp(totalXp);
  const nextThreshold = (lvl + 1) ** 2 * 50;
  return nextThreshold - totalXp;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/level.js tests/lib/level.test.js
git commit -m "feat(lib): level and xp-to-next-level math"
```

---

### Task 6: Streak with rest-day forgiveness

**Files:**
- Create: `public/js/lib/streak.js`
- Test: `tests/lib/streak.test.js`

The streak rule: consecutive days with ≥1 boss completed. One "rest day" per ISO week is permitted (does not break the streak). If a day passes with zero bosses and no rest day available that week, streak resets.

Input: an array of day summaries, in chronological order, each `{ date: 'YYYY-MM-DD', bossesCompleted: number }`.

Output: `{ streak: number, restDayUsedThisWeek: boolean }` as of today.

- [ ] **Step 1: Write failing tests**

`tests/lib/streak.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { computeStreak } from '../../public/js/lib/streak.js';

describe('computeStreak', () => {
  it('returns 0 for empty history', () => {
    expect(computeStreak([], '2026-05-24')).toEqual({ streak: 0, restDayUsedThisWeek: false });
  });

  it('counts consecutive boss-killing days backwards from today', () => {
    const history = [
      { date: '2026-05-22', bossesCompleted: 1 },
      { date: '2026-05-23', bossesCompleted: 2 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    expect(computeStreak(history, '2026-05-24')).toEqual({ streak: 3, restDayUsedThisWeek: false });
  });

  it('breaks streak on a zero-boss day with no rest day used', () => {
    const history = [
      { date: '2026-05-22', bossesCompleted: 1 },
      { date: '2026-05-23', bossesCompleted: 0 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    // Today (5-24) has 1 boss → streak = 1; 5-23 was zero and rest day available, but rest day is "consumed" by 5-23
    // so streak continues through 5-23: today=1, yesterday=rest-day-saved, 5-22=2, no earlier → streak=3
    expect(computeStreak(history, '2026-05-24')).toEqual({ streak: 3, restDayUsedThisWeek: true });
  });

  it('breaks when a second zero day happens in the same week', () => {
    // ISO week of 2026-05-24 starts Mon 2026-05-18
    const history = [
      { date: '2026-05-19', bossesCompleted: 1 },
      { date: '2026-05-20', bossesCompleted: 0 }, // rest day used
      { date: '2026-05-21', bossesCompleted: 1 },
      { date: '2026-05-22', bossesCompleted: 0 }, // no rest left → streak breaks here
      { date: '2026-05-23', bossesCompleted: 1 },
      { date: '2026-05-24', bossesCompleted: 1 }
    ];
    // walking backward: today=1, 5-23=1, 5-22=zero, no rest available (used earlier in week) → streak stops
    expect(computeStreak(history, '2026-05-24')).toEqual({ streak: 2, restDayUsedThisWeek: true });
  });

  it('treats missing days (gaps) as zero-boss days', () => {
    const history = [
      { date: '2026-05-22', bossesCompleted: 1 },
      { date: '2026-05-24', bossesCompleted: 1 }
      // 5-23 is missing → counts as zero
    ];
    // today=1, 5-23=zero (rest day saves it), 5-22=1 → streak=3
    expect(computeStreak(history, '2026-05-24')).toEqual({ streak: 3, restDayUsedThisWeek: true });
  });

  it('starts streak at 0 if today has no bosses and rest day already used', () => {
    const history = [
      { date: '2026-05-19', bossesCompleted: 0 }, // uses rest day
      { date: '2026-05-20', bossesCompleted: 1 },
      { date: '2026-05-24', bossesCompleted: 0 }  // today, no rest left
    ];
    expect(computeStreak(history, '2026-05-24')).toEqual({ streak: 0, restDayUsedThisWeek: true });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `public/js/lib/streak.js`**

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

  while (true) {
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
    // Safety: stop after 365 days backwards
    if (streak > 365) break;
  }

  return { streak, restDayUsedThisWeek };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS, all 6 streak tests.

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/streak.js tests/lib/streak.test.js
git commit -m "feat(lib): boss-kill streak with weekly rest-day forgiveness"
```

---

### Task 7: Day aggregation (XP, bosses defeated, completion status)

**Files:**
- Create: `public/js/lib/aggregate.js`
- Test: `tests/lib/aggregate.test.js`

`summarizeDay(tasks)` returns `{ totalXp, bossesCompleted, bossesPlanned, completionStatus }`.
`completionStatus` ∈ `'all-bosses' | 'partial' | 'missed' | 'rest'` based on counts. (`'rest'` is set externally; `summarizeDay` only returns the first three.)

`groupByBlock(tasks)` returns ordered array of `{ blockIndex, blockTitle, energy, tasks }`.

- [ ] **Step 1: Write failing tests**

`tests/lib/aggregate.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { summarizeDay, groupByBlock } from '../../public/js/lib/aggregate.js';

describe('summarizeDay', () => {
  it('returns zeros for empty tasks', () => {
    expect(summarizeDay([])).toEqual({
      totalXp: 0, bossesCompleted: 0, bossesPlanned: 0, completionStatus: 'missed'
    });
  });

  it('counts bosses and XP', () => {
    const tasks = [
      { type: 'power_up', done: true },
      { type: 'yolo', done: true },
      { type: 'boss', done: true },
      { type: 'boss', done: false }
    ];
    const r = summarizeDay(tasks);
    expect(r.totalXp).toBe(20 + 10 + 50 + 0);
    expect(r.bossesCompleted).toBe(1);
    expect(r.bossesPlanned).toBe(2);
    expect(r.completionStatus).toBe('partial');
  });

  it('reports all-bosses when every boss done', () => {
    const tasks = [
      { type: 'boss', done: true },
      { type: 'boss', done: true }
    ];
    expect(summarizeDay(tasks).completionStatus).toBe('all-bosses');
  });

  it('reports missed when bosses planned but none done', () => {
    const tasks = [{ type: 'boss', done: false }];
    expect(summarizeDay(tasks).completionStatus).toBe('missed');
  });
});

describe('groupByBlock', () => {
  it('groups by block index, ordered ascending', () => {
    const tasks = [
      { id: 'a', block: 2, blockTitle: 'Afternoon', energy: '🙂', order: 0, type: 'power_up', done: false },
      { id: 'b', block: 1, blockTitle: 'Morning',   energy: '😐', order: 0, type: 'power_up', done: false },
      { id: 'c', block: 1, blockTitle: 'Morning',   energy: '😐', order: 1, type: 'yolo',     done: false }
    ];
    const groups = groupByBlock(tasks);
    expect(groups.length).toBe(2);
    expect(groups[0].blockIndex).toBe(1);
    expect(groups[0].blockTitle).toBe('Morning');
    expect(groups[0].energy).toBe('😐');
    expect(groups[0].tasks.map(t => t.id)).toEqual(['b', 'c']);
    expect(groups[1].blockIndex).toBe(2);
  });

  it('sorts tasks within block by order', () => {
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

- [ ] **Step 3: Implement `public/js/lib/aggregate.js`**

```javascript
import { totalXpForTasks } from './xp.js';

export function summarizeDay(tasks) {
  const bosses = tasks.filter(t => t.type === 'boss');
  const bossesCompleted = bosses.filter(t => t.done).length;
  const bossesPlanned = bosses.length;
  let completionStatus = 'missed';
  if (bossesPlanned > 0 && bossesCompleted === bossesPlanned) completionStatus = 'all-bosses';
  else if (bossesCompleted > 0) completionStatus = 'partial';
  return {
    totalXp: totalXpForTasks(tasks),
    bossesCompleted,
    bossesPlanned,
    completionStatus
  };
}

export function groupByBlock(tasks) {
  const map = new Map();
  for (const t of tasks) {
    if (!map.has(t.block)) {
      map.set(t.block, {
        blockIndex: t.block,
        blockTitle: t.blockTitle ?? '',
        energy: t.energy ?? '',
        tasks: []
      });
    }
    map.get(t.block).tasks.push(t);
  }
  const groups = [...map.values()].sort((a, b) => a.blockIndex - b.blockIndex);
  for (const g of groups) g.tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return groups;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/lib/aggregate.js tests/lib/aggregate.test.js
git commit -m "feat(lib): day summary and group-by-block helpers"
```

---

## Phase 3 — Vercel serverless proxy

All endpoints check `Authorization: Bearer <passphrase>` against `APP_PASSPHRASE` env var. CORS: same-origin only (no headers needed).

### Task 8: Auth helper

**Files:**
- Create: `api/_helpers/auth.js`
- Test: `tests/api/auth.test.js`

- [ ] **Step 1: Write failing tests**

`tests/api/auth.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkAuth } from '../../api/_helpers/auth.js';

describe('checkAuth', () => {
  let originalPass;
  beforeEach(() => {
    originalPass = process.env.APP_PASSPHRASE;
    process.env.APP_PASSPHRASE = 'open-sesame';
  });
  afterEach(() => {
    process.env.APP_PASSPHRASE = originalPass;
  });

  it('returns true on matching Bearer token', () => {
    const req = { headers: { authorization: 'Bearer open-sesame' } };
    expect(checkAuth(req)).toBe(true);
  });
  it('returns false on missing header', () => {
    expect(checkAuth({ headers: {} })).toBe(false);
  });
  it('returns false on wrong token', () => {
    expect(checkAuth({ headers: { authorization: 'Bearer nope' } })).toBe(false);
  });
  it('returns false on non-Bearer scheme', () => {
    expect(checkAuth({ headers: { authorization: 'Basic open-sesame' } })).toBe(false);
  });
  it('returns false if env var unset', () => {
    delete process.env.APP_PASSPHRASE;
    expect(checkAuth({ headers: { authorization: 'Bearer anything' } })).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/_helpers/auth.js`**

```javascript
export function checkAuth(req) {
  const expected = process.env.APP_PASSPHRASE;
  if (!expected) return false;
  const header = req.headers?.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  return token === expected;
}

export function unauthorized(res) {
  res.status(401).json({ error: 'unauthorized' });
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_helpers/auth.js tests/api/auth.test.js
git commit -m "feat(api): bearer passphrase auth helper"
```

---

### Task 9: Notion client wrapper + row↔task mapping

**Files:**
- Create: `api/_helpers/notion.js`
- Test: `tests/api/notion.test.js`

This module exposes `getClient()`, `rowToTask(page)`, and `taskToProperties(task)`. The client is lazy-initialized from env vars. The mappers are pure and unit-testable without a network call.

- [ ] **Step 1: Write failing tests**

`tests/api/notion.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { rowToTask, taskToProperties } from '../../api/_helpers/notion.js';

const samplePage = {
  id: 'page-id-123',
  properties: {
    Title:        { title: [{ plain_text: 'Power Up' }] },
    Date:         { date: { start: '2026-05-24' } },
    Block:        { number: 1 },
    'Block Title':{ rich_text: [{ plain_text: 'Morning' }] },
    Type:         { select: { name: 'power_up' } },
    Description:  { rich_text: [{ plain_text: 'Eat / Call / Text' }] },
    'Min Mins':   { number: 30 },
    Order:        { number: 0 },
    Done:         { checkbox: false },
    'Completed At': { date: null },
    Energy:       { rich_text: [{ plain_text: '😐' }] }
  }
};

describe('rowToTask', () => {
  it('maps a Notion page to a flat task object', () => {
    expect(rowToTask(samplePage)).toEqual({
      id: 'page-id-123',
      title: 'Power Up',
      date: '2026-05-24',
      block: 1,
      blockTitle: 'Morning',
      type: 'power_up',
      description: 'Eat / Call / Text',
      minMins: 30,
      order: 0,
      done: false,
      completedAt: null,
      energy: '😐'
    });
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = {
      id: 'x',
      properties: {
        Title:        { title: [] },
        Date:         { date: null },
        Block:        { number: null },
        'Block Title':{ rich_text: [] },
        Type:         { select: null },
        Description:  { rich_text: [] },
        'Min Mins':   { number: null },
        Order:        { number: null },
        Done:         { checkbox: false },
        'Completed At': { date: null },
        Energy:       { rich_text: [] }
      }
    };
    expect(rowToTask(minimal)).toMatchObject({
      id: 'x', title: '', date: null, block: null, blockTitle: '',
      type: null, description: '', minMins: null, order: null,
      done: false, completedAt: null, energy: ''
    });
  });
});

describe('taskToProperties', () => {
  it('maps a task object to Notion property payload', () => {
    const task = {
      title: 'Boss', date: '2026-05-24', block: 1, blockTitle: 'Morning',
      type: 'boss', description: '', minMins: 45, order: 3,
      done: false, completedAt: null, energy: ''
    };
    const props = taskToProperties(task);
    expect(props.Title.title[0].text.content).toBe('Boss');
    expect(props.Date.date.start).toBe('2026-05-24');
    expect(props.Block.number).toBe(1);
    expect(props.Type.select.name).toBe('boss');
    expect(props['Min Mins'].number).toBe(45);
    expect(props.Done.checkbox).toBe(false);
  });

  it('omits Description property when description is empty', () => {
    const task = { title: 't', date: '2026-05-24', block: 1, blockTitle: 'M',
                   type: 'yolo', description: '', minMins: null, order: 0,
                   done: false, completedAt: null, energy: '' };
    const props = taskToProperties(task);
    expect(props.Description.rich_text).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/_helpers/notion.js`**

```javascript
import { Client } from '@notionhq/client';

let _client = null;

export function getClient() {
  if (_client) return _client;
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN env var not set');
  _client = new Client({ auth: token });
  return _client;
}

export function getDatabaseId() {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) throw new Error('NOTION_DATABASE_ID env var not set');
  return id;
}

const text = (rt) => (rt && rt.length > 0) ? rt.map(r => r.plain_text).join('') : '';

export function rowToTask(page) {
  const p = page.properties;
  return {
    id: page.id,
    title: text(p.Title?.title),
    date: p.Date?.date?.start ?? null,
    block: p.Block?.number ?? null,
    blockTitle: text(p['Block Title']?.rich_text),
    type: p.Type?.select?.name ?? null,
    description: text(p.Description?.rich_text),
    minMins: p['Min Mins']?.number ?? null,
    order: p.Order?.number ?? null,
    done: p.Done?.checkbox ?? false,
    completedAt: p['Completed At']?.date?.start ?? null,
    energy: text(p.Energy?.rich_text)
  };
}

const rt = (s) => s ? [{ type: 'text', text: { content: s } }] : [];

export function taskToProperties(task) {
  return {
    Title: { title: task.title ? [{ type: 'text', text: { content: task.title } }] : [] },
    Date: task.date ? { date: { start: task.date } } : { date: null },
    Block: { number: task.block ?? null },
    'Block Title': { rich_text: rt(task.blockTitle) },
    Type: task.type ? { select: { name: task.type } } : { select: null },
    Description: { rich_text: rt(task.description) },
    'Min Mins': { number: task.minMins ?? null },
    Order: { number: task.order ?? null },
    Done: { checkbox: !!task.done },
    'Completed At': task.completedAt ? { date: { start: task.completedAt } } : { date: null },
    Energy: { rich_text: rt(task.energy) }
  };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/_helpers/notion.js tests/api/notion.test.js
git commit -m "feat(api): notion client + row<->task mappers"
```

---

### Task 10: GET /api/day handler

**Files:**
- Create: `api/day.js`
- Test: `tests/api/day.test.js`

The handler reads `?date=YYYY-MM-DD`, queries Notion for tasks where Date matches, and returns `{ tasks: [...] }`.

We test by mocking the Notion client.

- [ ] **Step 1: Write failing tests**

`tests/api/day.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../api/_helpers/notion.js', async (orig) => {
  const real = await orig();
  return {
    ...real,
    getClient: () => ({ databases: { query: mockQuery } }),
    getDatabaseId: () => 'db-id'
  };
});

import handler from '../../api/day.js';

function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
  return res;
}

describe('GET /api/day', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    process.env.APP_PASSPHRASE = 'p';
  });

  it('returns 401 without auth', async () => {
    const req = { method: 'GET', query: { date: '2026-05-24' }, headers: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 without date param', async () => {
    const req = { method: 'GET', query: {}, headers: { authorization: 'Bearer p' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns mapped tasks for a date', async () => {
    mockQuery.mockResolvedValue({ results: [
      {
        id: 'pg1',
        properties: {
          Title: { title: [{ plain_text: 'Boss' }] },
          Date: { date: { start: '2026-05-24' } },
          Block: { number: 1 },
          'Block Title': { rich_text: [{ plain_text: 'Morning' }] },
          Type: { select: { name: 'boss' } },
          Description: { rich_text: [] },
          'Min Mins': { number: 45 },
          Order: { number: 3 },
          Done: { checkbox: false },
          'Completed At': { date: null },
          Energy: { rich_text: [] }
        }
      }
    ] });
    const req = { method: 'GET', query: { date: '2026-05-24' },
                  headers: { authorization: 'Bearer p' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('Boss');
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({
      database_id: 'db-id',
      filter: { property: 'Date', date: { equals: '2026-05-24' } }
    }));
  });

  it('returns 405 for non-GET', async () => {
    const req = { method: 'POST', query: { date: '2026-05-24' },
                  headers: { authorization: 'Bearer p' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/day.js`**

```javascript
import { checkAuth, unauthorized } from './_helpers/auth.js';
import { getClient, getDatabaseId, rowToTask } from './_helpers/notion.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  if (!checkAuth(req)) return unauthorized(res);
  const date = req.query?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
  }
  try {
    const result = await getClient().databases.query({
      database_id: getDatabaseId(),
      filter: { property: 'Date', date: { equals: date } }
    });
    res.status(200).json({ tasks: result.results.map(rowToTask) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/day.js tests/api/day.test.js
git commit -m "feat(api): GET /api/day handler"
```

---

### Task 11: POST /api/tasks (batch create)

**Files:**
- Create: `api/tasks.js`
- Test: `tests/api/tasks.test.js`

Accepts `{ tasks: [...] }` and creates all rows in parallel. Returns `{ created: [...with ids] }`.

- [ ] **Step 1: Write failing tests**

`tests/api/tasks.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
vi.mock('../../api/_helpers/notion.js', async (orig) => {
  const real = await orig();
  return {
    ...real,
    getClient: () => ({ pages: { create: mockCreate } }),
    getDatabaseId: () => 'db-id'
  };
});

import handler from '../../api/tasks.js';

function makeRes() {
  return {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
}

describe('POST /api/tasks', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.APP_PASSPHRASE = 'p';
  });

  it('returns 401 without auth', async () => {
    const res = makeRes();
    await handler({ method: 'POST', headers: {}, body: { tasks: [] } }, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 with no tasks array', async () => {
    const res = makeRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer p' }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('creates each task and returns ids', async () => {
    mockCreate.mockImplementation(async ({ properties }) => ({
      id: 'new-' + properties.Title.title[0].text.content
    }));
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer p' },
      body: { tasks: [
        { title: 'A', date: '2026-05-25', block: 1, blockTitle: 'M', type: 'power_up',
          description: '', minMins: null, order: 0, done: false, completedAt: null, energy: '' },
        { title: 'B', date: '2026-05-25', block: 1, blockTitle: 'M', type: 'boss',
          description: '', minMins: 45, order: 1, done: false, completedAt: null, energy: '' }
      ]}
    };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.created).toHaveLength(2);
    expect(res.body.created[0].id).toBe('new-A');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler({ method: 'GET', headers: { authorization: 'Bearer p' } }, res);
    expect(res.statusCode).toBe(405);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/tasks.js`**

```javascript
import { checkAuth, unauthorized } from './_helpers/auth.js';
import { getClient, getDatabaseId, taskToProperties, rowToTask } from './_helpers/notion.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!checkAuth(req)) return unauthorized(res);
  const tasks = req.body?.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'tasks array required' });
  }
  try {
    const client = getClient();
    const dbId = getDatabaseId();
    const created = await Promise.all(tasks.map(t =>
      client.pages.create({ parent: { database_id: dbId }, properties: taskToProperties(t) })
    ));
    res.status(201).json({ created: created.map(rowToTask) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/tasks.js tests/api/tasks.test.js
git commit -m "feat(api): POST /api/tasks batch create"
```

---

### Task 12: PATCH and DELETE /api/task/[id]

**Files:**
- Create: `api/task/[id].js`
- Test: `tests/api/task-id.test.js`

PATCH accepts a partial task; DELETE archives the page.

- [ ] **Step 1: Write failing tests**

`tests/api/task-id.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdate = vi.fn();
vi.mock('../../api/_helpers/notion.js', async (orig) => {
  const real = await orig();
  return {
    ...real,
    getClient: () => ({ pages: { update: mockUpdate } }),
    getDatabaseId: () => 'db-id'
  };
});

import handler from '../../api/task/[id].js';

function makeRes() {
  return { statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; } };
}

describe('PATCH /api/task/[id]', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    process.env.APP_PASSPHRASE = 'p';
  });

  it('returns 401 without auth', async () => {
    const res = makeRes();
    await handler({ method: 'PATCH', headers: {}, query: { id: 'x' }, body: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  it('updates only the provided fields (Done + Completed At)', async () => {
    mockUpdate.mockResolvedValue({
      id: 'pg1',
      properties: {
        Title: { title: [{ plain_text: 'B' }] },
        Date: { date: { start: '2026-05-24' } },
        Block: { number: 1 },
        'Block Title': { rich_text: [{ plain_text: 'M' }] },
        Type: { select: { name: 'boss' } },
        Description: { rich_text: [] },
        'Min Mins': { number: 45 },
        Order: { number: 0 },
        Done: { checkbox: true },
        'Completed At': { date: { start: '2026-05-24' } },
        Energy: { rich_text: [] }
      }
    });
    const req = {
      method: 'PATCH', headers: { authorization: 'Bearer p' },
      query: { id: 'pg1' },
      body: { done: true, completedAt: '2026-05-24' }
    };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.task.done).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      page_id: 'pg1',
      properties: expect.objectContaining({
        Done: { checkbox: true },
        'Completed At': { date: { start: '2026-05-24' } }
      })
    }));
    // Did NOT include Title or other untouched fields
    const props = mockUpdate.mock.calls[0][0].properties;
    expect(props.Title).toBeUndefined();
    expect(props.Date).toBeUndefined();
  });

  it('archives on DELETE', async () => {
    mockUpdate.mockResolvedValue({});
    const req = { method: 'DELETE', headers: { authorization: 'Bearer p' },
                  query: { id: 'pg1' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(204);
    expect(mockUpdate).toHaveBeenCalledWith({ page_id: 'pg1', archived: true });
  });

  it('returns 405 for unsupported method', async () => {
    const res = makeRes();
    await handler({ method: 'PUT', headers: { authorization: 'Bearer p' },
                    query: { id: 'x' }, body: {} }, res);
    expect(res.statusCode).toBe(405);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/task/[id].js`**

```javascript
import { checkAuth, unauthorized } from '../_helpers/auth.js';
import { getClient, rowToTask } from '../_helpers/notion.js';

function partialProperties(body) {
  const out = {};
  if ('title' in body)       out.Title = { title: body.title ? [{ type: 'text', text: { content: body.title } }] : [] };
  if ('date' in body)        out.Date = body.date ? { date: { start: body.date } } : { date: null };
  if ('block' in body)       out.Block = { number: body.block ?? null };
  if ('blockTitle' in body)  out['Block Title'] = { rich_text: body.blockTitle ? [{ type: 'text', text: { content: body.blockTitle } }] : [] };
  if ('type' in body)        out.Type = body.type ? { select: { name: body.type } } : { select: null };
  if ('description' in body) out.Description = { rich_text: body.description ? [{ type: 'text', text: { content: body.description } }] : [] };
  if ('minMins' in body)     out['Min Mins'] = { number: body.minMins ?? null };
  if ('order' in body)       out.Order = { number: body.order ?? null };
  if ('done' in body)        out.Done = { checkbox: !!body.done };
  if ('completedAt' in body) out['Completed At'] = body.completedAt ? { date: { start: body.completedAt } } : { date: null };
  if ('energy' in body)      out.Energy = { rich_text: body.energy ? [{ type: 'text', text: { content: body.energy } }] : [] };
  return out;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return unauthorized(res);
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  const client = getClient();
  try {
    if (req.method === 'PATCH') {
      const page = await client.pages.update({
        page_id: id,
        properties: partialProperties(req.body ?? {})
      });
      return res.status(200).json({ task: rowToTask(page) });
    }
    if (req.method === 'DELETE') {
      await client.pages.update({ page_id: id, archived: true });
      return res.status(204).end?.() ?? res.status(204).json({});
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/task/[id].js tests/api/task-id.test.js
git commit -m "feat(api): PATCH and DELETE /api/task/[id]"
```

---

### Task 13: GET /api/history

**Files:**
- Create: `api/history.js`
- Test: `tests/api/history.test.js`

Returns task rows for the last N days (default 30). Used by the streak calculation and history calendar.

- [ ] **Step 1: Write failing tests**

`tests/api/history.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../api/_helpers/notion.js', async (orig) => {
  const real = await orig();
  return {
    ...real,
    getClient: () => ({ databases: { query: mockQuery } }),
    getDatabaseId: () => 'db-id'
  };
});

import handler from '../../api/history.js';

function makeRes() {
  return { statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; } };
}

describe('GET /api/history', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    process.env.APP_PASSPHRASE = 'p';
  });

  it('returns 401 without auth', async () => {
    const res = makeRes();
    await handler({ method: 'GET', headers: {}, query: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  it('defaults days=30, queries on or after cutoff', async () => {
    mockQuery.mockResolvedValue({ results: [] });
    const req = { method: 'GET', headers: { authorization: 'Bearer p' }, query: {} };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([]);
    const call = mockQuery.mock.calls[0][0];
    expect(call.filter.property).toBe('Date');
    expect(call.filter.date.on_or_after).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('respects custom days param', async () => {
    mockQuery.mockResolvedValue({ results: [] });
    const req = { method: 'GET', headers: { authorization: 'Bearer p' }, query: { days: '7' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/history.js`**

```javascript
import { checkAuth, unauthorized } from './_helpers/auth.js';
import { getClient, getDatabaseId, rowToTask } from './_helpers/notion.js';
import { todayISO, addDays } from '../public/js/lib/dates.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  if (!checkAuth(req)) return unauthorized(res);
  const days = Math.max(1, Math.min(365, Number(req.query?.days ?? 30)));
  const cutoff = addDays(todayISO(), -days);
  try {
    const result = await getClient().databases.query({
      database_id: getDatabaseId(),
      filter: { property: 'Date', date: { on_or_after: cutoff } },
      page_size: 100
    });
    res.status(200).json({ tasks: result.results.map(rowToTask) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/history.js tests/api/history.test.js
git commit -m "feat(api): GET /api/history"
```

---

## Phase 4 — Frontend skeleton

### Task 14: HTML shell + global CSS

**Files:**
- Create: `public/index.html`
- Create: `public/css/styles.css`

- [ ] **Step 1: Create `public/index.html`**

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
  <link rel="stylesheet" href="/css/styles.css" />
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

  <div class="drawer" id="drawer-plan"   hidden></div>
  <div class="drawer" id="drawer-history" hidden></div>
  <div class="drawer" id="drawer-settings" hidden></div>

  <div class="passphrase-overlay" id="passphrase-overlay" hidden>
    <div class="passphrase-box">
      <h2>Passphrase</h2>
      <input type="password" id="passphrase-input" autocomplete="off" />
      <button id="passphrase-submit">Unlock</button>
      <p class="passphrase-error" id="passphrase-error" hidden>Incorrect.</p>
    </div>
  </div>

  <div id="effects-layer" aria-hidden="true"></div>

  <script type="module" src="/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `public/css/styles.css`**

```css
:root {
  --bg: #0e0f12;
  --surface: #16181d;
  --surface-2: #1d2027;
  --text: #f0f1f4;
  --text-dim: #8a8f9c;
  --accent: #f5b800;
  --boss: #f5b800;
  --boss-dim: #5a4400;
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

.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; position: sticky; top: 0; z-index: 10;
  background: var(--bg); border-bottom: 1px solid var(--surface-2);
}
.topbar-left, .topbar-right { display: flex; gap: 12px; align-items: center; }
.level-badge { font-family: var(--font-display); font-weight: 700; font-size: 18px; }
.streak { font-size: 15px; color: var(--text); }
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

.block-card {
  background: var(--surface); border-radius: var(--radius); padding: 16px;
  box-shadow: var(--shadow);
}
.block-header {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 12px;
}
.block-title { font-family: var(--font-display); font-weight: 700; font-size: 22px; }
.energy-picker { display: flex; gap: 6px; }
.energy-picker button {
  background: transparent; border: 1px solid var(--surface-2); color: var(--text);
  width: 30px; height: 30px; border-radius: 50%; font-size: 14px; padding: 0;
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
  margin-top: 2px;
}
.task-row.done .task-checkbox { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.task-row.boss.done .task-checkbox { background: var(--boss); }
.task-content { flex: 1; }
.task-title { font-weight: 500; }
.task-row.boss .task-title { color: var(--boss); font-weight: 600; }
.task-desc { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
.task-meta { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

.fab-container {
  position: fixed; bottom: 0; left: 0; right: 0; padding: 16px;
  display: flex; justify-content: center;
  background: linear-gradient(180deg, transparent, var(--bg) 50%);
}
.fab {
  background: var(--accent); color: var(--bg); font-weight: 600;
  padding: 14px 24px; border: none; border-radius: 999px; font-size: 15px;
  box-shadow: 0 4px 12px rgba(245,184,0,0.3);
}

.drawer {
  position: fixed; left: 0; right: 0; bottom: 0; max-height: 90vh;
  background: var(--surface); border-radius: var(--radius) var(--radius) 0 0;
  padding: 20px; overflow-y: auto; z-index: 30;
  box-shadow: 0 -8px 24px rgba(0,0,0,0.5);
  transform: translateY(100%); transition: transform 280ms cubic-bezier(.25,.1,.25,1);
}
.drawer:not([hidden]) { display: block; }
.drawer.open { transform: translateY(0); }
.drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 20;
  opacity: 0; transition: opacity 280ms;
}
.drawer-backdrop.open { opacity: 1; }

.passphrase-overlay {
  position: fixed; inset: 0; background: var(--bg); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.passphrase-box {
  background: var(--surface); padding: 32px; border-radius: var(--radius);
  max-width: 320px; width: 90%; display: flex; flex-direction: column; gap: 12px;
}
.passphrase-box input { padding: 10px; font-size: 16px; border-radius: 8px; border: 1px solid var(--surface-2); background: var(--bg); color: var(--text); }
.passphrase-box button { padding: 10px; background: var(--accent); color: var(--bg); border: none; border-radius: 8px; font-weight: 600; }
.passphrase-error { color: var(--red); margin: 0; font-size: 13px; }

#effects-layer {
  position: fixed; inset: 0; pointer-events: none; z-index: 50;
  overflow: hidden;
}
.xp-popup {
  position: absolute; font-family: var(--font-display); font-weight: 700; font-size: 28px;
  color: var(--accent);
  animation: xp-float 900ms ease-out forwards;
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
}

@media (max-width: 600px) {
  .topbar { padding: 12px 14px; }
  main { padding: 0 14px; margin-top: 16px; }
}
```

- [ ] **Step 3: Smoke-test in browser**

Run: `npm run dev`
Open: `http://localhost:3000`
Expected: page loads, shows top bar with "Lv 0" and "🔥 0", an empty XP bar, and a "+ Plan tomorrow" button at the bottom. The passphrase overlay should be hidden (the JS hasn't shown it yet — that comes in later tasks).

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/css/styles.css
git commit -m "feat(ui): HTML shell + global CSS"
```

---

### Task 15: Passphrase prompt module

**Files:**
- Create: `public/js/ui/passphrase.js`

- [ ] **Step 1: Implement `public/js/ui/passphrase.js`**

```javascript
const KEY = 'timetable.passphrase';

export function getStoredPassphrase() {
  return localStorage.getItem(KEY);
}

export function setStoredPassphrase(p) {
  localStorage.setItem(KEY, p);
}

export function clearStoredPassphrase() {
  localStorage.removeItem(KEY);
}

export function showPassphrasePrompt({ errorMessage } = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('passphrase-overlay');
    const input = document.getElementById('passphrase-input');
    const submit = document.getElementById('passphrase-submit');
    const err = document.getElementById('passphrase-error');
    overlay.hidden = false;
    input.value = '';
    err.hidden = !errorMessage;
    if (errorMessage) err.textContent = errorMessage;
    input.focus();
    function done() {
      const value = input.value.trim();
      if (!value) return;
      overlay.hidden = true;
      submit.removeEventListener('click', done);
      input.removeEventListener('keydown', onEnter);
      resolve(value);
    }
    function onEnter(e) {
      if (e.key === 'Enter') done();
    }
    submit.addEventListener('click', done);
    input.addEventListener('keydown', onEnter);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/ui/passphrase.js
git commit -m "feat(ui): passphrase prompt module"
```

---

### Task 16: Storage module (proxy client + offline queue)

**Files:**
- Create: `public/js/storage.js`

This module is the *only* thing in the frontend that talks to the network. It exposes `loadDay(date)`, `loadHistory(days)`, `createTasks(tasks)`, `updateTask(id, patch)`, `deleteTask(id)`, and `flushQueue()`. Failed writes go into a localStorage queue and replay on `flushQueue()` (called on app start and on network online events).

- [ ] **Step 1: Implement `public/js/storage.js`**

```javascript
import { getStoredPassphrase, showPassphrasePrompt, setStoredPassphrase, clearStoredPassphrase } from './ui/passphrase.js';

const QUEUE_KEY = 'timetable.writeQueue';

async function request(path, init = {}) {
  let pass = getStoredPassphrase();
  if (!pass) pass = await promptAndStore();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pass}`, ...(init.headers ?? {}) };
  let res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    clearStoredPassphrase();
    pass = await promptAndStore({ errorMessage: 'Incorrect passphrase.' });
    headers.Authorization = `Bearer ${pass}`;
    res = await fetch(path, { ...init, headers });
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error ?? msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function promptAndStore(opts) {
  const p = await showPassphrasePrompt(opts);
  setStoredPassphrase(p);
  return p;
}

export async function loadDay(date) {
  const { tasks } = await request(`/api/day?date=${encodeURIComponent(date)}`);
  return tasks;
}

export async function loadHistory(days = 30) {
  const { tasks } = await request(`/api/history?days=${days}`);
  return tasks;
}

export async function createTasks(tasks) {
  const { created } = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ tasks }) });
  return created;
}

export async function updateTask(id, patch) {
  try {
    const { task } = await request(`/api/task/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    return task;
  } catch (e) {
    enqueue({ op: 'update', id, patch });
    throw e;
  }
}

export async function deleteTask(id) {
  try {
    await request(`/api/task/${id}`, { method: 'DELETE' });
  } catch (e) {
    enqueue({ op: 'delete', id });
    throw e;
  }
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; }
}
function writeQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
function enqueue(item) {
  const q = readQueue();
  q.push(item);
  writeQueue(q);
}

export async function flushQueue() {
  const q = readQueue();
  if (q.length === 0) return;
  const remaining = [];
  for (const item of q) {
    try {
      if (item.op === 'update') {
        await request(`/api/task/${item.id}`, { method: 'PATCH', body: JSON.stringify(item.patch) });
      } else if (item.op === 'delete') {
        await request(`/api/task/${item.id}`, { method: 'DELETE' });
      }
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
}

window.addEventListener('online', () => { flushQueue().catch(() => {}); });
```

- [ ] **Step 2: Commit**

```bash
git add public/js/storage.js
git commit -m "feat(ui): storage module — proxy client + offline write queue"
```

---

### Task 17: Top-bar render

**Files:**
- Create: `public/js/ui/topbar.js`

- [ ] **Step 1: Implement `public/js/ui/topbar.js`**

```javascript
import { levelForTotalXp, xpToNextLevel } from '../lib/level.js';

export function renderTopbar({ totalLifetimeXp, todayXp, streak }) {
  const level = levelForTotalXp(totalLifetimeXp);
  const toNext = xpToNextLevel(totalLifetimeXp);
  const totalForLevel = todayXp + toNext;
  const pct = totalForLevel === 0 ? 0 : Math.min(100, (todayXp / Math.max(todayXp + toNext, 1)) * 100);

  document.getElementById('level-badge').textContent = `Lv ${level}`;
  document.getElementById('streak').textContent = `🔥 ${streak}`;
  document.getElementById('xp-fill').style.width = `${pct}%`;
  document.getElementById('xp-text').textContent = `${todayXp} XP today`;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/ui/topbar.js
git commit -m "feat(ui): top-bar render"
```

---

### Task 18: Effects module (confetti, XP popup, sounds, loot drops)

**Files:**
- Create: `public/js/ui/effects.js`

Confetti is lazy-loaded from a CDN to avoid bundling. Sounds are inline base64 WAV or Web Audio API tones (simpler — Web Audio).

- [ ] **Step 1: Implement `public/js/ui/effects.js`**

```javascript
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

const SOUND_ENABLED_KEY = 'timetable.soundEnabled';
export function isSoundEnabled() {
  return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
}
export function setSoundEnabled(v) {
  localStorage.setItem(SOUND_ENABLED_KEY, v ? 'true' : 'false');
}

function tone(freq, duration = 0.1, type = 'sine', volume = 0.15) {
  if (!isSoundEnabled()) return;
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

export function playTick() {
  tone(880, 0.08, 'triangle', 0.12);
}
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
    origin: { x: (x ?? window.innerWidth / 2) / window.innerWidth,
              y: (y ?? window.innerHeight / 2) / window.innerHeight },
    colors: big ? ['#f5b800', '#ffd45a', '#fff', '#5b9df2'] : ['#f5b800', '#ffd45a']
  });
}

export function showBossBanner() {
  const layer = document.getElementById('effects-layer');
  const el = document.createElement('div');
  el.className = 'boss-banner';
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
```

- [ ] **Step 2: Commit**

```bash
git add public/js/ui/effects.js
git commit -m "feat(ui): effects module — confetti, xp popup, sounds, loot drops"
```

---

### Task 19: Day view rendering

**Files:**
- Create: `public/js/ui/day.js`

- [ ] **Step 1: Implement `public/js/ui/day.js`**

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
    empty.style.cssText = 'text-align:center; color:var(--text-dim); padding:40px 20px; font-family:var(--font-display); font-size:18px;';
    empty.textContent = 'No plan for today. Tap "Plan tomorrow" to start.';
    root.appendChild(empty);
    return;
  }

  const groups = groupByBlock(tasks);
  for (const group of groups) {
    root.appendChild(renderBlock(group));
  }
}

function renderBlock(group) {
  const card = document.createElement('section');
  card.className = 'block-card';
  card.dataset.blockIndex = group.blockIndex;

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
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onEnergyPickHandler?.(group, emoji);
    });
    energy.appendChild(b);
  }
  header.appendChild(energy);
  card.appendChild(header);

  for (const t of group.tasks) {
    card.appendChild(renderTask(t));
  }

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

  row.addEventListener('click', () => {
    onTaskToggleHandler?.(t, row);
  });

  return row;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/ui/day.js
git commit -m "feat(ui): day view rendering with block cards and tasks"
```

---

### Task 20: app.js — orchestrate load, render, check-off

**Files:**
- Create: `public/js/app.js`

- [ ] **Step 1: Implement `public/js/app.js`** (initial version — drawers added in later tasks)

```javascript
import { todayISO } from './lib/dates.js';
import { summarizeDay } from './lib/aggregate.js';
import { computeStreak } from './lib/streak.js';
import { totalXpForTasks } from './lib/xp.js';
import { loadDay, loadHistory, updateTask, flushQueue } from './storage.js';
import { renderTopbar } from './ui/topbar.js';
import { renderDay, onTaskToggle, onEnergyPick } from './ui/day.js';
import { confettiBurst, xpPopup, playTick, playBossKill, showBossBanner, showLootIfDue } from './ui/effects.js';

const state = {
  date: todayISO(),
  tasks: [],
  history: []
};

async function refresh() {
  try {
    state.tasks = await loadDay(state.date);
    state.history = await loadHistory(60);
    renderAll();
  } catch (e) {
    toast(`Load failed: ${e.message}`);
  }
}

function renderAll() {
  const { totalXp } = summarizeDay(state.tasks);
  const lifetimeXp = state.history.reduce((s, t) => s + (t.done ? xpFor(t) : 0), 0);
  const dayBuckets = bucketHistoryByDate(state.history);
  const { streak } = computeStreak(dayBuckets, state.date);
  renderTopbar({ totalLifetimeXp: lifetimeXp, todayXp: totalXp, streak });
  renderDay(state.tasks);
}

function xpFor(t) {
  return { yolo: 10, power_up: 20, regular: 20, boss: 50 }[t.type] ?? 0;
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
  // optimistic update
  const idx = state.tasks.findIndex(t => t.id === task.id);
  const prev = state.tasks[idx];
  state.tasks[idx] = { ...prev, done: newDone, completedAt };
  renderAll();

  if (newDone) {
    const rect = rowEl.getBoundingClientRect();
    const amount = xpFor(task);
    const x = rect.right - 20;
    const y = rect.top;
    xpPopup({ x, y, amount, kind: task.type === 'boss' ? 'boss' : 'normal' });
    confettiBurst({ x, y, big: task.type === 'boss' });
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
  } catch (e) {
    state.tasks[idx] = prev;
    renderAll();
    toast(`Save failed: ${e.message}. Queued for retry.`);
  }
});

onEnergyPick(async (group, emoji) => {
  // Apply emoji to every task in the block
  const updates = state.tasks.filter(t => t.block === group.blockIndex);
  for (const t of updates) t.energy = emoji;
  renderAll();
  await Promise.all(updates.map(t => updateTask(t.id, { energy: emoji }).catch(() => {})));
});

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

(async function init() {
  await flushQueue().catch(() => {});
  await refresh();
})();
```

- [ ] **Step 2: Manual browser test**

Run: `npm run dev` (after setting up `.env.local` with NOTION_TOKEN, NOTION_DATABASE_ID, APP_PASSPHRASE — and having created the Notion DB with the columns from the spec).

Open: `http://localhost:3000`
- Expect passphrase prompt → enter passphrase → unlocks.
- If the Notion DB has tasks for today, they should render.
- Click a task → confetti, XP popup, top bar XP increments. Boss row shows gold + bigger celebration.
- Reload page → state persists (came from Notion).

If no tasks exist yet, manually add a row in the Notion DB with Date = today's date, Block = 1, Type = boss, Title = "test boss", Done = unchecked. Reload site to verify.

- [ ] **Step 3: Commit**

```bash
git add public/js/app.js
git commit -m "feat(ui): app.js orchestration — load, render, check-off"
```

---

## Phase 5 — Night-planning drawer

### Task 21: Drawer base behavior

**Files:**
- Create: `public/js/ui/drawer.js`

A reusable drawer that wraps any content with a slide-up animation and backdrop.

- [ ] **Step 1: Implement `public/js/ui/drawer.js`**

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
git add public/js/ui/drawer.js
git commit -m "feat(ui): generic drawer slide-up component"
```

---

### Task 22: Plan-tomorrow drawer content

**Files:**
- Modify: `public/js/app.js` — wire up the "+ Plan tomorrow" button
- Create: `public/js/ui/plan-drawer.js`

The plan drawer:
1. Computes tomorrow's date.
2. Loads tasks from yesterday (or, more precisely, today's current plan) and uses it as the template skeleton.
3. Renders one section per block with editable fields: block title, power-up title + description, yolo title + minMins, additional regular tasks (add/remove), boss title + minMins.
4. "+ Add block" button.
5. "Save" → calls `createTasks` with the full batch.

- [ ] **Step 1: Implement `public/js/ui/plan-drawer.js`**

```javascript
import { addDays, todayISO } from '../lib/dates.js';

export function buildPlanDrawer({ skeleton, targetDate, onSave, onCancel }) {
  return (root) => {
    root.style.maxHeight = '90vh';
    const h = document.createElement('h2');
    h.textContent = `Plan for ${targetDate}`;
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    const blocksContainer = document.createElement('div');
    blocksContainer.id = 'plan-blocks';
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
    powerUp:    { title: 'Power Up', description: '1. Eat\n2. Call\n3. Text' },
    yolo:       { title: 'Yolo task', minMins: 30 },
    regulars:   [],
    boss:       { title: '', minMins: 45 }
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
  card.appendChild(makeFieldPair('Yolo title', b.yolo.title, v => b.yolo.title = v, 'Min mins', b.yolo.minMins, v => b.yolo.minMins = Number(v)));

  // Regulars
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

  card.appendChild(makeFieldPair('⚔ Boss title', b.boss.title, v => b.boss.title = v, 'Min mins', b.boss.minMins, v => b.boss.minMins = Number(v)));

  return card;
}

function makeField(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin: 6px 0;';
  const l = document.createElement('div');
  l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('input');
  i.value = value ?? '';
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i);
  return wrap;
}

function makeTextarea(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin:6px 0;';
  const l = document.createElement('div');
  l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('textarea');
  i.value = value ?? '';
  i.rows = 3;
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px; font-family:inherit; resize:vertical;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i);
  return wrap;
}

function makeFieldPair(label1, v1, on1, label2, v2, on2) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; gap:8px; margin:6px 0;';
  const main = makeField(label1, v1, on1); main.style.flex = '3';
  const min = makeField(label2, v2, on2); min.style.flex = '1';
  wrap.append(main, min);
  return wrap;
}

function makeFieldPairWithRemove(label1, v1, on1, label2, v2, on2, onRemove) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; gap:6px; align-items:flex-end; margin:4px 0;';
  const main = makeField(label1, v1, on1); main.style.flex = '3';
  const min = makeField(label2, v2, on2); min.style.flex = '1';
  const rm = document.createElement('button');
  rm.textContent = '×';
  rm.style.cssText = 'background:transparent; color:var(--text-dim); border:none; font-size:20px; padding: 0 6px;';
  rm.addEventListener('click', onRemove);
  wrap.append(main, min, rm);
  return wrap;
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
    else if (t.type === 'boss') { b.boss.title = ''; b.boss.minMins = t.minMins ?? 45; }
    // regulars are not carried over by default — bosses/yolos change daily
  }
  return [...byBlock.values()].sort((a, b) => a.blockIndex - b.blockIndex);
}
```

- [ ] **Step 2: Wire up in `public/js/app.js`** — add at the bottom of file, after `init()`:

```javascript
import { openDrawer, closeDrawer } from './ui/drawer.js';
import { buildPlanDrawer, tasksToSkeleton } from './ui/plan-drawer.js';
import { createTasks } from './storage.js';

document.getElementById('btn-plan-tomorrow').addEventListener('click', async () => {
  const tomorrow = addDays(state.date, 1);
  // Use today's plan as the skeleton (carries over Power Up structure)
  const skeleton = tasksToSkeleton(state.tasks);
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

Also import `addDays` at top of file:
```javascript
import { todayISO, addDays } from './lib/dates.js';
```
(Replace the existing single import.)

- [ ] **Step 3: Manual browser test**

Run: `npm run dev`
- Tap "+ Plan tomorrow".
- Drawer slides up, prefilled with today's structure (or default skeleton if today is empty).
- Edit a block title, change Power Up sub-items, set Boss task.
- Tap "Save plan" → drawer closes, toast confirms.
- In Notion, verify rows created with tomorrow's date.

- [ ] **Step 4: Commit**

```bash
git add public/js/ui/plan-drawer.js public/js/app.js
git commit -m "feat(ui): night-planning drawer with prefilled template"
```

---

## Phase 6 — History view

### Task 23: History calendar drawer

**Files:**
- Create: `public/js/ui/history.js`
- Modify: `public/js/app.js` — wire up the calendar icon

`history.js` exports a builder that renders a 30-day mini calendar. Each day's cell is colored by completion status. Click a day to see its tasks (read-only).

- [ ] **Step 1: Implement `public/js/ui/history.js`**

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
    // Header row: M T W T F S S
    for (const d of ['M','T','W','T','F','S','S']) {
      const cell = document.createElement('div');
      cell.textContent = d;
      cell.style.cssText = 'text-align:center; color:var(--text-dim); font-size:11px;';
      grid.appendChild(cell);
    }
    // Start from 4 weeks ago (Monday)
    const start = isoWeekStart(addDays(today, -28));
    for (let i = 0; i < 35; i++) {
      const date = addDays(start, i);
      const tasks = tasksByDate.get(date) ?? [];
      const sum = summarizeDay(tasks);
      const cell = document.createElement('button');
      cell.style.cssText = 'aspect-ratio:1; border:none; border-radius:6px; font-size:11px; padding:0; cursor:pointer;';
      const dayNum = Number(date.split('-')[2]);
      cell.textContent = String(dayNum);
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
  for (const t of tasks.sort((a, b) => (a.block - b.block) || (a.order - b.order))) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; font-size:13px; padding:4px 0; color: ' + (t.done ? 'var(--text-dim)' : 'var(--text)');
    row.innerHTML = `<span>${t.done ? '✓' : '○'}</span> <span>${t.blockTitle}</span> <span>${t.type === 'boss' ? '⚔ ' : ''}${t.title}</span>`;
    root.appendChild(row);
  }
}
```

- [ ] **Step 2: Wire up in `public/js/app.js`** — append:

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
- Tap 📅 in top bar.
- Calendar opens showing the past 5 weeks (4 back + current).
- Today is outlined. Days with all-bosses-done are gold, partials green, missed red.
- Click a past day → its tasks list appears below.

- [ ] **Step 4: Commit**

```bash
git add public/js/ui/history.js public/js/app.js
git commit -m "feat(ui): history calendar drawer with daily detail"
```

---

## Phase 7 — Settings, DB bootstrap, README

### Task 24: Settings drawer + sound toggle + DB bootstrap

**Files:**
- Create: `public/js/ui/settings.js`
- Create: `api/bootstrap.js`
- Create: `tests/api/bootstrap.test.js`
- Modify: `public/js/app.js`
- Modify: `public/js/storage.js`

`bootstrap.js` is a one-time endpoint that creates the Notion database with the correct schema inside a chosen parent page. The user pastes a parent page ID once.

- [ ] **Step 1: Write failing test for bootstrap endpoint**

`tests/api/bootstrap.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
vi.mock('../../api/_helpers/notion.js', async (orig) => {
  const real = await orig();
  return {
    ...real,
    getClient: () => ({ databases: { create: mockCreate } })
  };
});

import handler from '../../api/bootstrap.js';

function makeRes() {
  return { statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; } };
}

describe('POST /api/bootstrap', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.APP_PASSPHRASE = 'p';
  });

  it('returns 401 without auth', async () => {
    const res = makeRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 without parent_page_id', async () => {
    const res = makeRes();
    await handler({ method: 'POST', headers: { authorization: 'Bearer p' }, body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('creates DB with the timetable schema', async () => {
    mockCreate.mockResolvedValue({ id: 'db-new-123' });
    const res = makeRes();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer p' },
      body: { parent_page_id: 'parent-xyz' }
    }, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.database_id).toBe('db-new-123');
    const call = mockCreate.mock.calls[0][0];
    expect(call.parent.page_id).toBe('parent-xyz');
    expect(call.properties).toHaveProperty('Title');
    expect(call.properties).toHaveProperty('Date');
    expect(call.properties).toHaveProperty('Block');
    expect(call.properties.Type.select.options.map(o => o.name).sort())
      .toEqual(['boss', 'power_up', 'regular', 'yolo']);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement `api/bootstrap.js`**

```javascript
import { checkAuth, unauthorized } from './_helpers/auth.js';
import { getClient } from './_helpers/notion.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!checkAuth(req)) return unauthorized(res);
  const parent = req.body?.parent_page_id;
  if (!parent) return res.status(400).json({ error: 'parent_page_id required' });
  try {
    const db = await getClient().databases.create({
      parent: { type: 'page_id', page_id: parent },
      title: [{ type: 'text', text: { content: 'Timetable Tasks' } }],
      properties: {
        'Title':        { title: {} },
        'Date':         { date: {} },
        'Block':        { number: {} },
        'Block Title':  { rich_text: {} },
        'Type':         { select: { options: [
          { name: 'power_up', color: 'blue' },
          { name: 'yolo',     color: 'purple' },
          { name: 'regular',  color: 'default' },
          { name: 'boss',     color: 'orange' }
        ] } },
        'Description':  { rich_text: {} },
        'Min Mins':     { number: {} },
        'Order':        { number: {} },
        'Done':         { checkbox: {} },
        'Completed At': { date: {} },
        'Energy':       { rich_text: {} }
      }
    });
    res.status(201).json({ database_id: db.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add bootstrap call to storage.js** — append:

```javascript
export async function bootstrapDatabase(parentPageId) {
  return request('/api/bootstrap', { method: 'POST', body: JSON.stringify({ parent_page_id: parentPageId }) });
}
```

- [ ] **Step 6: Implement `public/js/ui/settings.js`**

```javascript
import { isSoundEnabled, setSoundEnabled } from './effects.js';
import { clearStoredPassphrase } from './passphrase.js';
import { bootstrapDatabase } from '../storage.js';

export function buildSettingsDrawer({ onClose }) {
  return (root) => {
    const h = document.createElement('h2');
    h.textContent = 'Settings';
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    // Sound toggle
    const soundRow = document.createElement('label');
    soundRow.style.cssText = 'display:flex; justify-content:space-between; padding:10px 0; align-items:center;';
    soundRow.innerHTML = '<span>Sound effects</span>';
    const soundInput = document.createElement('input');
    soundInput.type = 'checkbox';
    soundInput.checked = isSoundEnabled();
    soundInput.addEventListener('change', () => setSoundEnabled(soundInput.checked));
    soundRow.appendChild(soundInput);
    root.appendChild(soundRow);

    // Passphrase reset
    const passRow = document.createElement('div');
    passRow.style.cssText = 'padding:10px 0; border-top:1px solid var(--surface-2);';
    passRow.innerHTML = '<div style="margin-bottom:6px;">Forget stored passphrase</div>';
    const passBtn = document.createElement('button');
    passBtn.textContent = 'Sign out';
    passBtn.style.cssText = 'padding:8px 16px; background:transparent; color:var(--red); border:1px solid var(--red); border-radius:6px;';
    passBtn.addEventListener('click', () => {
      clearStoredPassphrase();
      location.reload();
    });
    passRow.appendChild(passBtn);
    root.appendChild(passRow);

    // Bootstrap DB
    const bootstrapRow = document.createElement('div');
    bootstrapRow.style.cssText = 'padding:10px 0; border-top:1px solid var(--surface-2);';
    bootstrapRow.innerHTML = `
      <div style="margin-bottom:6px;">Create Notion database</div>
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:6px;">
        Paste a Notion page ID (must be a page your integration has access to).
        After creating, copy the returned database ID into your Vercel <code>NOTION_DATABASE_ID</code> env var.
      </div>
    `;
    const pageInput = document.createElement('input');
    pageInput.placeholder = 'Notion page ID';
    pageInput.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface-2); color:var(--text); border-radius:6px; margin-bottom:6px;';
    const bootBtn = document.createElement('button');
    bootBtn.textContent = 'Create database';
    bootBtn.style.cssText = 'padding:8px 16px; background:var(--accent); color:var(--bg); border:none; border-radius:6px;';
    const result = document.createElement('div');
    result.style.cssText = 'margin-top:6px; font-family:monospace; font-size:12px;';
    bootBtn.addEventListener('click', async () => {
      const id = pageInput.value.trim();
      if (!id) return;
      bootBtn.disabled = true;
      try {
        const r = await bootstrapDatabase(id);
        result.textContent = `Created: ${r.database_id}`;
        result.style.color = 'var(--green)';
      } catch (e) {
        result.textContent = `Error: ${e.message}`;
        result.style.color = 'var(--red)';
      } finally {
        bootBtn.disabled = false;
      }
    });
    bootstrapRow.append(pageInput, bootBtn, result);
    root.appendChild(bootstrapRow);

    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'margin-top:14px; width:100%; padding:12px; background:transparent; color:var(--text); border:1px solid var(--surface-2); border-radius:8px;';
    close.addEventListener('click', onClose);
    root.appendChild(close);
  };
}
```

- [ ] **Step 7: Wire up in `public/js/app.js`** — append:

```javascript
import { buildSettingsDrawer } from './ui/settings.js';

document.getElementById('btn-settings').addEventListener('click', () => {
  const drawer = document.getElementById('drawer-settings');
  openDrawer(drawer, buildSettingsDrawer({ onClose: () => closeDrawer(drawer) }));
});
```

- [ ] **Step 8: Commit**

```bash
git add api/bootstrap.js tests/api/bootstrap.test.js public/js/ui/settings.js public/js/storage.js public/js/app.js
git commit -m "feat: settings drawer with sound toggle, sign-out, and DB bootstrap"
```

---

### Task 25: README with setup instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# Timetable

ADHD-tuned gamified daily planner. Static site + Vercel serverless proxy backed by Notion.

## Setup

### 1. Create a Notion integration
1. Go to https://www.notion.so/my-integrations and create a new internal integration.
2. Copy the integration's secret token (starts with `secret_`).
3. In Notion, create a page (e.g., "Timetable") and share it with the integration ("Add connections" menu).
4. Copy the page ID from the URL (the 32-char hex string).

### 2. Local development
```bash
cp .env.example .env.local
# Fill in NOTION_TOKEN and APP_PASSPHRASE
# Leave NOTION_DATABASE_ID empty for now — we'll create the DB next
npm install
npm run dev
```
Open http://localhost:3000 → enter passphrase → go to ⚙ Settings → paste page ID → "Create database". Copy the returned DB ID into `.env.local` as `NOTION_DATABASE_ID`, then restart `npm run dev`.

### 3. Deploy to Vercel
```bash
vercel
# When prompted, link to a project.
# Add env vars in Vercel dashboard: NOTION_TOKEN, NOTION_DATABASE_ID, APP_PASSPHRASE
vercel --prod
```

## Daily use

- Open the site. The passphrase auto-fills from localStorage after first entry.
- Today's plan renders. Tap a task to mark it done.
- Tap "+ Plan tomorrow" to open the night-planning drawer.
- Tap 📅 to see the history calendar and review past days.
- Tap ⚙ to toggle sound, sign out, or re-bootstrap the database.

## Testing

```bash
npm test          # run all tests once
npm run test:watch # watch mode
```

## Architecture

See `docs/superpowers/specs/2026-05-24-timetable-design.md`.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with setup and daily-use instructions"
```

---

## Phase 8 — Deployment & final pass

### Task 26: Deploy to Vercel (manual, by user)

**Files:** none

- [ ] **Step 1: User runs `vercel` from the repo root**

This is interactive. Follow prompts:
- Set up and deploy → yes
- Which scope → personal
- Link to existing → no
- Project name → `timetable`
- Code directory → `.`

- [ ] **Step 2: Add env vars in the Vercel dashboard**

Vercel → Project → Settings → Environment Variables:
- `NOTION_TOKEN` = `secret_...`
- `NOTION_DATABASE_ID` = `...`
- `APP_PASSPHRASE` = chosen passphrase

- [ ] **Step 3: Promote to production**

```bash
vercel --prod
```

- [ ] **Step 4: Smoke-test the live URL**

Open the deployed URL in a phone browser. Enter the passphrase. Verify:
- Passphrase persists.
- Today's tasks render.
- Check-off works.
- Night-planning drawer creates rows in Notion.

- [ ] **Step 5: Push to GitHub**

```bash
gh repo create timetable --private --source . --remote origin --push
```

---

### Task 27: Final self-review pass

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Verify all features in the deployed site**

Checklist:
- [ ] Passphrase prompt appears on first load and persists.
- [ ] Today view renders.
- [ ] Task check-off shows confetti + XP popup + sound.
- [ ] Boss check-off shows boss banner + bigger confetti.
- [ ] Every 5th check-off shows a loot-drop toast.
- [ ] Energy emoji picker on block header works and persists.
- [ ] "+ Plan tomorrow" drawer opens, prefilled, saves.
- [ ] 📅 history opens, shows calendar with correct colors.
- [ ] Click a past day shows that day's tasks.
- [ ] ⚙ settings: sound toggle works, sign-out clears passphrase.
- [ ] Streak counter increments correctly.
- [ ] Mobile responsive (single column, tappable targets).

- [ ] **Step 3: Commit any final fixes**

If any of the checklist items fail, fix them and add a commit referencing the specific bug.

---

## Self-review notes (from plan author)

**Spec coverage check:**
- Tech stack (spec §"Tech stack") → Tasks 1–2.
- Notion data model (spec §"Notion data model") → Tasks 9, 24 (bootstrap schema).
- Single-page Today UI (spec §"UI structure") → Tasks 14, 17, 19, 20.
- Plan-tomorrow drawer (spec §"Night-planning flow") → Tasks 21, 22.
- History calendar (spec §"UI structure" — history view) → Task 23.
- Game mechanics §3 (dopamine on check-off) → Task 18, used in Task 20.
- Game mechanics §4 (XP, levels, streak with forgiveness) → Tasks 4, 5, 6, 17, 20.
- Game mechanics §5 (night-fill template) → Task 22.
- Game mechanics §6 (energy check) → Tasks 19, 20.
- Proxy API (spec §"Proxy API") → Tasks 10, 11, 12, 13.
- Error handling & offline (spec §"Error handling & offline") → Task 16 (queue), Task 20 (optimistic UI + toast).
- Out-of-scope items (timer, focus mode, multi-user, push) → correctly omitted.

**Type consistency check:**
- Task shape used identically across `rowToTask`, `taskToProperties`, `partialProperties`, frontend storage, and UI rendering: `{ id, title, date, block, blockTitle, type, description, minMins, order, done, completedAt, energy }`. Consistent.
- `groupByBlock` returns `{ blockIndex, blockTitle, energy, tasks }` — consumed by `renderDay` and `renderBlock`. Consistent.
- `computeStreak` returns `{ streak, restDayUsedThisWeek }` — only `streak` is consumed by topbar; `restDayUsedThisWeek` is reserved for future UI display. Acceptable.

**Placeholder scan:** No TBDs, no "TODO", no "handle errors appropriately" without code. All code blocks contain runnable code.

**Decision pinned during planning:**
- Auth: chose passphrase prompt (simpler than Vercel Password Protection because it integrates with the proxy directly).
- DB bootstrap: app-driven via Settings drawer (Task 24), not manual schema copy-paste.
- Sound: Web Audio API tones (no external sound files needed).
- Confetti: lazy-loaded from skypack CDN (no bundler).

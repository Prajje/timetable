# Timetable — ADHD-Tuned Gamified Daily Planner

**Date:** 2026-05-24
**Author:** Prajwal Prakash
**Status:** Design approved, pending plan
**Revision:** 2026-05-24 — pivoted from Notion+Vercel to localStorage-only after weighing setup overhead. Architecture deliberately keeps the storage module behind a clean interface so a future v2 can swap in a Notion+Vercel backend with ~1 hour of work.

## Goal

A personal, single-user web app for daily planning that turns a to-do list into a lightweight game. Designed around ADHD-specific pain points: low activation energy on first task, time-blindness, dopamine deficit on long tasks, shame-spiral after missed days.

Daily structure (from existing pen-and-paper template):

- **Variable 1–5 blocks per day** (typically Morning / Afternoon / Evening).
- Each block contains, in order:
  - **Power Up** — 1 task with 1–3 small social/self-care sub-items (Eat / Call / Text). Acts as activation energy.
  - **Yolo task** — one 30-minute creative/random task. Warm-up.
  - **0+ regular tasks** — additional planned work.
  - **Level Boss** — the one important deep-work task for the block (~45 min). Gold accent.

User fills the next day's plan at night and executes during the day.

## Tech stack

- **Frontend:** vanilla HTML/CSS/JS, modular files. No framework. Matches existing resume-microsite pattern (`hello-doordash`, `hello-axion`). Keeps the repo lean.
- **Hosting:** GitHub Pages (free, zero account setup beyond GitHub which is already configured).
- **Backend:** none. No server, no proxy, no API.
- **Database:** browser localStorage. Single blob keyed under `timetable.data`.
- **Repo:** new GitHub repo `timetable`. Public or private — user's call at push time.

## Data model (localStorage)

One key in localStorage: `timetable.data`. Value is a JSON object:

```json
{
  "tasks": [
    {
      "id": "uuid",
      "date": "2026-05-24",
      "block": 1,
      "blockTitle": "Morning",
      "type": "power_up | yolo | regular | boss",
      "title": "ML System Design",
      "description": "1. Eat / 2. Call / 3. Text",
      "minMins": 45,
      "order": 0,
      "done": false,
      "completedAt": null,
      "energy": "😐"
    }
  ],
  "settings": {
    "soundEnabled": true
  }
}
```

- IDs are generated with `crypto.randomUUID()` in the browser.
- Day-level stats (XP, bosses defeated, streak count) are **computed on the fly** from the task array.
- Storage abstraction: the `storage.js` module exposes `loadDay(date)`, `loadHistory(days)`, `createTasks(tasks)`, `updateTask(id, patch)`, `deleteTask(id)`. Implementation is localStorage; future swap to a backend = rewriting only this file.

## UI structure

Single page `/` (served as `index.html` from GitHub Pages):

```
┌────────────────────────────────────────┐
│  Day 47 · 🔥 12-day streak    ⚙ 📅     │   ← top bar
│  ████████░░░░░░  140 XP today          │   ← XP bar
├────────────────────────────────────────┤
│  Morning  😐                           │
│  ☐ Power Up        Eat / Call / Text   │
│  ☐ Yolo task       (30 min)            │
│  ☐ Leetcode        (45 min)            │
│  ☐ ⚔ Level Boss   ML System Design     │   ← gold accent
│                                        │
│  Afternoon …                           │
│  Evening …                             │
├────────────────────────────────────────┤
│       [ + Plan tomorrow ]              │   ← slide-up drawer
└────────────────────────────────────────┘
```

### Components

- **Top bar:** level badge (from lifetime XP), streak counter (🔥), today's XP bar, calendar icon (history), settings icon.
- **Day view:** blocks as cards, tasks as rows. Boss row gets a gold left-border accent. Energy emoji shown next to block title.
- **Check-off interaction:** tap a task → confetti + floating "+20 XP" + soft tick sound. Boss = bigger confetti + "BOSS DEFEATED" banner + lower-pitched sound.
- **Plan-tomorrow drawer:** slides up. Prefilled with today's block skeleton (Power Up sub-items carry over).
- **History drawer (calendar icon):** mini calendar of recent days, colored by outcome.
- **Settings drawer:** sound on/off, export data (JSON download), import data (JSON upload), clear all data.

### Style

Modern minimal with game accents. Inter for body, Fraunces for display (matching existing resume sites). Boss tasks: gold/amber. XP bar: gradient. Confetti on completion. No 8-bit pixel art.

### Mobile

Same layout, single column. Touch-friendly tap targets. Responsive.

## Game mechanics

### XP & Levels

- Yolo: 10 XP
- Regular: 20 XP
- Power Up: 20 XP
- Boss: 50 XP

Lifetime XP determines **Level** via `level = floor(sqrt(totalXP / 50))` — gentle curve.

### Streak (with forgiveness)

- **Boss-kill streak** = consecutive days where at least one Boss task was completed.
- One free **rest day per ISO week** that doesn't break the streak.
- If rest day already used and a day passes with zero bosses → streak resets.
- Rest-day allowance refills every Monday.

### Dopamine on check-off

- Every check-off → confetti + XP popup + soft tick.
- Every 5th check-off → "loot drop" affirmation pulled from a hard-coded list of ~30 messages (variable reinforcement).
- Boss kill → bigger celebration (boss banner, bigger confetti, satisfying lower-pitched sound).

### Night-fill template

- "+ Plan tomorrow" button opens drawer prefilled with today's structure.
- Same block count and titles, same Power Up tasks pre-populated.
- User edits Yolo + Boss + any extras.
- Save → batch-inserts rows into localStorage with new UUIDs.

### Energy check

- First interaction with a block on its date → tiny non-blocking emoji picker (😩 / 😐 / 🙂 / ⚡).
- One tap stores it on the block's tasks.
- Skippable.

## Export / Import

To mitigate the "browser data loss" risk:

- **Export** button in settings → downloads `timetable-backup-YYYY-MM-DD.json` containing the full `timetable.data` blob.
- **Import** button → file picker; replaces current data after a confirm dialog.
- Recommended: export once a week. (Could be future-automated via a daily reminder, out of scope for v1.)

## Out of scope for v1

- Cloud sync (Notion / Vercel / any backend) — explicitly deferred. Architecture preserves the swap path.
- Per-task Pomodoro timer ("Min Mins" stays decorative).
- Focus mode (UI dim during a running timer).
- Multi-user / sharing.
- Push notifications / reminders.
- Auth (single-user single-browser).

## Migration path to Notion+Vercel (informational, not v1)

If/when cross-device sync becomes desired:

1. Add `api/` directory with the proxy from the original spec rev 1.
2. Rewrite `storage.js` (only file that changes) to hit `/api/*` instead of localStorage.
3. One-time data migration: use the existing Export button → run a small script that POSTs the exported JSON to `/api/tasks` in batches.

Estimated effort: ~1 working session.

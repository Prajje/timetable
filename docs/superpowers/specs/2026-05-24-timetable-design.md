# Timetable — ADHD-Tuned Gamified Daily Planner

**Date:** 2026-05-24
**Author:** Prajwal Prakash
**Status:** Design approved, pending plan

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

- **Frontend:** vanilla HTML/CSS/JS, modular files. No framework. Matches existing resume-microsite pattern (`hello-doordash`, `hello-axion`). Keeps the repo lean and deploy-instant.
- **Hosting:** Vercel (static site + one serverless function).
- **Backend:** single Vercel serverless function under `/api/*`, acting as a thin Notion API proxy. Notion integration token lives in Vercel env vars (never client-side).
- **Database:** one Notion database called **Timetable Tasks** (schema below).
- **Repo:** new GitHub repo `timetable`.
- **Auth (single-user):** passphrase prompt on first load; passphrase stored in localStorage and sent as `Authorization: Bearer <passphrase>` header to the proxy. Proxy compares to `APP_PASSPHRASE` env var. Lightweight, no provider setup.

## Notion data model

**One database, one row per task.** Columns:

| Property | Type | Notes |
|---|---|---|
| Title | title | e.g., "Power Up", "Yolo task", "ML System Design" |
| Date | date | the day this task belongs to |
| Block | number | 1–5, position within day |
| Block Title | rich_text | "Morning" / "Afternoon" / "Evening" / custom. Stored redundantly on every task in the block. |
| Type | select | `power_up` / `yolo` / `regular` / `boss` |
| Description | rich_text | for Power Up sub-items ("1. Eat / 2. Call / 3. Text") |
| Min Mins | number | optional, e.g., 30, 45. Decorative label only (no timer in v1). |
| Order | number | sort order within the block |
| Done | checkbox | |
| Completed At | date | set on check-off; used for XP/streak math |
| Energy | rich_text | emoji set when block first activated (😩 / 😐 / 🙂 / ⚡) |

Day-level stats (XP earned, bosses defeated, streak count) are **computed on the fly in the browser** from these rows. No separate Day DB.

## UI structure

Single page `/` with three states layered on one screen:

```
┌────────────────────────────────────────┐
│  Day 47 · 🔥 12-day streak    ⚙ 📅     │   ← top bar
│  ████████░░░░░░  140 / 250 XP          │   ← XP bar for today
├────────────────────────────────────────┤
│  Morning  😐                           │
│  ☐ Power Up        Eat / Call / Text   │
│  ☐ Yolo task       (30 min)            │
│  ☐ Leetcode        (45 min)            │
│  ☐ ⚔️ Level Boss   ML System Design    │
│                                        │
│  Afternoon …                           │
│  Evening …                             │
├────────────────────────────────────────┤
│       [ Plan tomorrow ]                │   ← opens slide-up drawer
└────────────────────────────────────────┘
```

### Components

- **Top bar:** level badge (lifetime XP), streak counter (🔥), today's XP bar, calendar icon (history), settings icon.
- **Day view:** blocks rendered as cards; tasks as rows. Boss row has gold left-border accent. Energy emoji shown next to block title.
- **Check-off interaction:** tap a task → confetti burst + floating "+20 XP" + soft tick sound. Boss kill = bigger confetti + "BOSS DEFEATED" banner + lower-pitched sound.
- **Plan-tomorrow drawer:** slides up from the bottom. Prefilled with yesterday's block skeleton. User edits and saves; creates Notion rows in one batch.
- **History view (calendar icon):** mini calendar of recent days, each colored by outcome — all bosses defeated = gold, partial = green, missed = gray, rest-day-used = blue.
- **Settings drawer:** passphrase, Notion DB connection test, sound on/off, rest-day counter for the week.

### Style

Modern minimal with game accents. Inter for body, Fraunces for display (matching existing resume sites). Boss tasks: gold/amber color. XP bar: gradient. Confetti on completion. No 8-bit pixel art.

### Mobile

Same layout, single column. Touch-friendly tap targets. Responsive.

## Game mechanics

### XP & Levels

- Yolo task: 10 XP
- Regular task: 20 XP
- Power Up: 20 XP
- Level Boss: 50 XP

Daily XP shown as the top bar. Lifetime XP determines **Level** via `level = floor(sqrt(totalXP / 50))` — gentle curve, gets harder slowly.

### Streak (with forgiveness)

- **Boss-kill streak** = consecutive days where at least one Boss task was completed.
- One free **rest day per ISO week** that doesn't break the streak.
- If rest day already used and a day passes with zero bosses → streak resets to 0.
- Rest-day allowance refills every Monday.

### Dopamine on check-off

- Every check-off → confetti + XP popup + soft tick.
- Every 5th check-off → "loot drop" affirmation pulled from a hard-coded list of ~30 messages (variable reinforcement).
- Boss kill → bigger celebration (boss banner, bigger confetti, satisfying lower-pitched sound).

### Night-fill template

- "Plan tomorrow" button opens drawer prefilled with yesterday's structure.
- Same number of blocks, same Power Up tasks pre-populated.
- User edits Yolo + Boss + any extras.
- Save → batch-creates all rows in Notion.

### Energy check

- First interaction with a block on its date → tiny non-blocking emoji picker appears in block header (😩 / 😐 / 🙂 / ⚡).
- One tap stores it on the block's tasks (denormalized).
- Skippable.

## Night-planning flow

1. Tap "Plan tomorrow" → drawer slides up showing tomorrow's date.
2. Drawer shows yesterday's block skeleton, editable.
3. For each block: edit name, edit Power Up sub-items (prefilled), enter Yolo task, regular tasks, Boss task.
4. "Save" → POST batches all rows to the proxy, proxy creates them in Notion via `Promise.all`.
5. Drawer closes. Opening the site tomorrow shows the plan.

## Proxy API (Vercel serverless function)

All endpoints require `Authorization: Bearer <passphrase>` header; mismatched returns 401.

- `GET /api/day?date=YYYY-MM-DD` → returns all task rows for that date.
- `POST /api/tasks` → batch-create. Body: array of task objects.
- `PATCH /api/task/:id` → update (toggle done, edit title, set Completed At, etc.).
- `DELETE /api/task/:id` → delete.
- `GET /api/history?days=30` → returns recent days' rows summarized (for calendar view).

## Error handling & offline

- Notion API failure → toast notification, retry button.
- Check-off uses optimistic UI; on write failure, UI reverts and shows toast.
- No internet → site loads (CDN), check-offs queue in localStorage, replay on reconnect.
- Bad passphrase → soft error, prompt to retry.
- First-time setup: if Notion DB is empty / missing, settings drawer offers a "create database" button (one-time setup that creates the DB in a chosen parent page via Notion API).

## Out of scope for v1

- Per-task Pomodoro timer (deferred; "Min Mins" stays decorative).
- Focus mode (UI dim during a running timer) — depends on timer.
- Multi-user / sharing / accountability.
- Push notifications / reminders.
- Cross-device sync of unsubmitted draft state.

## Open decisions for implementation plan

- Exact passphrase mechanism vs. Vercel password protection — pick one during planning.
- Notion DB auto-bootstrap (let app create the DB) vs. one-time manual setup with copy-paste schema instructions.
- Sound library / tick sound source.
- Confetti library (canvas-confetti vs. hand-rolled).

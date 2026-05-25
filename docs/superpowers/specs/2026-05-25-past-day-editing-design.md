# Past-Day Editing via History Calendar

## Goal

Let the user click any past day in the history calendar and interact with it as if it were today — toggle tasks done/undone, edit the plan, pick block energy. Useful for backfilling check-offs they forgot to mark in real time.

## Core idea

`state.date` already drives every render in the app. Picking a past day just sets `state.date` to that date and re-renders. All existing widgets (day view, plan-edit drawer, pencils, energy picker, task toggle) are already date-agnostic, so they work for any date with no duplication.

## Behavior

### Navigation

- Click a past day in the history calendar → drawer closes, `state.date` switches to that date, main view re-renders.
- Click today's cell in the calendar → same behavior, navigates back to today.
- Click a future date → no-op (preserves current dimmed/disabled behavior; out of scope for this feature).
- The inline "history detail" panel under the calendar is removed — clicking now navigates instead of showing a read-only detail.

### Past-day banner

When `state.date !== todayISO()`, a banner appears between the XP bar and `<main>`:

```
Viewing Mon May 20 · Back to today
```

"Back to today" is clickable; sets `state.date = todayISO()` and re-renders. When `state.date === todayISO()`, the banner is hidden.

### Interactions on a past day

All existing interactions work unchanged:

- **Toggle done/undone**: same handler. `completedAt` is set to `todayISO()` (when the user marked it), not the task's date — matching the existing toggle code.
- **Effects** (XP popup, confetti, sounds) fire on retroactive toggle. They're satisfying and the user explicitly wants the "click if I finished" feel.
- **Energy picker**: works as today.
- **Pencil → plan-edit drawer**: works as today (the drawer already takes `targetDate: state.date`).

### Topbar while viewing a past day

- `Lv X` — lifetime level, unchanged.
- `🔥 streak` — always computed from real today, not `state.date`. The streak number stays stable regardless of which day you're viewing.
- XP text — `"30 XP today"` becomes `"30 XP"` when not on today (avoids labeling a past day's XP as "today").

### FAB while viewing a past day

- If the past day has tasks → FAB hidden (use the pencil to edit).
- If the past day is empty → FAB shows `+ Plan this day` (lets the user backfill a plan).
- "+ Plan tomorrow" is never shown on a past day — semantics are too confusing.

## Data and storage

No schema changes, no migrations. Existing localStorage data (`timetable.data` key) is untouched. The feature is purely a UI/navigation extension on top of the existing `updateTask`/`createTasks`/`deleteTask` storage layer, which already handles arbitrary dates.

## Files touched

- `js/app.js` — calendar pick now navigates; banner render; FAB visibility logic; "back to today" handler; decouple streak from `state.date`.
- `js/ui/history.js` — calendar click navigates instead of rendering inline detail; remove `renderHistoryDetail` and its container.
- `js/ui/topbar.js` — accept `isToday` flag so the "today" word can be suppressed in XP text.
- `index.html` — add `<div id="past-day-banner" hidden></div>` between the XP bar and `<main>`.

## Out of scope

- Future-date interaction (still dimmed/disabled).
- Calendar grid changes (5-week window, colors, legend stay).
- Storage/schema changes.
- Showing a "you marked this late" indicator on retroactively-checked tasks.

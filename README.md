# Timetable

ADHD-tuned gamified daily planner. Pure static site, all data lives in your browser.

## Daily use

1. Open the site.
2. Today's plan renders. Tap a task to check it off — confetti, XP, sounds.
3. Tap **+ Plan tomorrow** to fill in tomorrow's blocks. Today's structure is used as a template.
4. Tap **📅** for the calendar / history view.
5. Tap **⚙** for the sound toggle and **backups** (recommended weekly).

## Important: back up your data

All data lives in your browser's localStorage. If you clear browser data, you lose everything. Solution:
- Settings → "Download backup" once a week. Save the JSON somewhere safe.
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

40 unit tests covering pure logic (dates, XP, levels, streak forgiveness, day aggregation) and the storage layer.

## Architecture

See `docs/superpowers/specs/2026-05-24-timetable-design.md`.

## Future: cloud sync

`js/storage.js` is the only file that talks to data. To add cross-device sync later (Notion + Vercel proxy), rewrite that one file. The interface is preserved deliberately. See spec → "Migration path".

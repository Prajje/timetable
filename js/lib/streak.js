import { addDays, isoWeekStart } from './dates.js';

export function computeStreak(history, today) {
  if (history.length === 0) {
    return { streak: 0, restDayUsedThisWeek: false };
  }

  const dates = history.map(h => h.date).sort();
  const earliest = dates[0];
  const byDate = new Map(history.map(h => [h.date, h.bossesCompleted]));

  const restSpentByWeek = new Map();
  for (const { date, bossesCompleted } of history) {
    if (bossesCompleted === 0) {
      const wk = isoWeekStart(date);
      const existing = restSpentByWeek.get(wk);
      if (!existing || date < existing) restSpentByWeek.set(wk, date);
    }
  }

  const thisWeekStart = isoWeekStart(today);
  let restDayUsedThisWeek = restSpentByWeek.has(thisWeekStart);

  let streak = 0;
  let cursor = today;

  while (cursor >= earliest && streak <= 365) {
    const bosses = byDate.get(cursor) ?? 0;
    if (bosses > 0) {
      streak++;
    } else {
      const wk = isoWeekStart(cursor);
      const restSpentDay = restSpentByWeek.get(wk) ?? null;
      if (restSpentDay === cursor) {
        streak++;
      } else if (restSpentDay === null && !byDate.has(cursor)) {
        streak++;
        restSpentByWeek.set(wk, cursor);
        if (wk === thisWeekStart) restDayUsedThisWeek = true;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }

  return { streak, restDayUsedThisWeek };
}

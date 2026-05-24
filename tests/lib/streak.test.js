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

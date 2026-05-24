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
    expect(isoWeekStart('2026-05-24')).toBe('2026-05-18');
    expect(isoWeekStart('2026-05-18')).toBe('2026-05-18');
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

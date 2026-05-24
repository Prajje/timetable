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

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

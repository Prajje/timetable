import { describe, it, expect } from 'vitest';
import { summarizeDay, groupByBlock } from '../../js/lib/aggregate.js';

describe('summarizeDay', () => {
  it('zero for empty', () => {
    expect(summarizeDay([])).toEqual({ totalXp: 0, bossesCompleted: 0, bossesPlanned: 0, completionStatus: 'missed' });
  });

  it('counts bosses and xp', () => {
    const r = summarizeDay([
      { type: 'power_up', done: true },
      { type: 'yolo', done: true },
      { type: 'boss', done: true },
      { type: 'boss', done: false }
    ]);
    expect(r.totalXp).toBe(80);
    expect(r.bossesCompleted).toBe(1);
    expect(r.bossesPlanned).toBe(2);
    expect(r.completionStatus).toBe('partial');
  });

  it('reports all-bosses', () => {
    expect(summarizeDay([{ type: 'boss', done: true }, { type: 'boss', done: true }]).completionStatus).toBe('all-bosses');
  });

  it('reports missed when bosses planned, none done', () => {
    expect(summarizeDay([{ type: 'boss', done: false }]).completionStatus).toBe('missed');
  });
});

describe('groupByBlock', () => {
  it('groups by block ascending', () => {
    const tasks = [
      { id: 'a', block: 2, blockTitle: 'Afternoon', energy: '🙂', order: 0 },
      { id: 'b', block: 1, blockTitle: 'Morning', energy: '😐', order: 0 },
      { id: 'c', block: 1, blockTitle: 'Morning', energy: '😐', order: 1 }
    ];
    const g = groupByBlock(tasks);
    expect(g.length).toBe(2);
    expect(g[0].blockIndex).toBe(1);
    expect(g[0].tasks.map(t => t.id)).toEqual(['b', 'c']);
  });

  it('sorts tasks by order', () => {
    const tasks = [
      { id: 'a', block: 1, blockTitle: 'M', energy: '', order: 2 },
      { id: 'b', block: 1, blockTitle: 'M', energy: '', order: 0 },
      { id: 'c', block: 1, blockTitle: 'M', energy: '', order: 1 }
    ];
    expect(groupByBlock(tasks)[0].tasks.map(t => t.id)).toEqual(['b', 'c', 'a']);
  });
});

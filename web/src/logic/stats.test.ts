import { describe, expect, it } from 'vitest';
import { matching, multiple, single } from './fixtures';
import { isMastered, recordAnswer, sectionStats, totals } from './stats';

describe('recordAnswer / isMastered', () => {
  it('освоен после двух верных подряд', () => {
    let p = recordAnswer(undefined, true, 1);
    expect(isMastered(p)).toBe(false);
    p = recordAnswer(p, true, 2);
    expect(isMastered(p)).toBe(true);
    p = recordAnswer(p, false, 3);
    expect(isMastered(p)).toBe(false);
    expect(p).toMatchObject({ attempts: 3, correct: 2, last: [true, false], updatedAt: 3 });
  });
});

describe('sectionStats', () => {
  it('считает по разделам и итог', () => {
    const progress = {
      '1': { attempts: 2, correct: 2, last: [true, true], updatedAt: 0 },
      '3': { attempts: 1, correct: 0, last: [false], updatedAt: 0 },
    };
    const s = sectionStats([single, multiple, matching], ['A', 'B'], progress);
    expect(s).toEqual([
      { section: 'A', total: 2, answered: 1, mastered: 1, attempts: 2, correct: 2 },
      { section: 'B', total: 1, answered: 1, mastered: 0, attempts: 1, correct: 0 },
    ]);
    expect(totals(s)).toEqual({ total: 3, answered: 2, mastered: 1, attempts: 3, correct: 2 });
  });
});

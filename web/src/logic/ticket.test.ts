import { describe, expect, it } from 'vitest';
import type { Question } from '../data/types';
import { single } from './fixtures';
import { seeded } from './random';
import { allocate, makeTicket } from './ticket';

// размеры разделов реального банка
const SIZES = [26, 92, 155, 69, 63, 27];

describe('allocate', () => {
  it('сумма равна count', () => {
    for (const n of [1, 5, 40, 100, 431, 432]) {
      expect(allocate(SIZES, n).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });

  it('40 вопросов распределяются пропорционально', () => {
    expect(allocate(SIZES, 40)).toEqual([2, 9, 14, 6, 6, 3]);
  });

  it('count больше банка обрезается', () => {
    expect(allocate(SIZES, 1000)).toEqual(SIZES);
    expect(allocate(SIZES, 0)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('makeTicket', () => {
  const sections = ['A', 'B', 'C'];
  let id = 0;
  const bank: Question[] = [10, 20, 30].flatMap((n, i) =>
    Array.from({ length: n }, () => ({ ...single, id: ++id, section: sections[i] })),
  );

  it('уникальные id, порядок по разделам, детерминирован при одном rng', () => {
    const t = makeTicket(bank, sections, 12, seeded(1));
    expect(t).toHaveLength(12);
    expect(new Set(t).size).toBe(12);
    expect(t).toEqual([...t].sort((a, b) => a - b));
    expect(makeTicket(bank, sections, 12, seeded(1))).toEqual(t);
    expect(makeTicket(bank, sections, 12, seeded(2))).not.toEqual(t);
  });
});

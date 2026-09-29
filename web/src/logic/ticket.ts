import type { Question } from '../data/types';
import { shuffle, type Rng } from './random';

/**
 * Число вопросов из каждого раздела: пропорционально размеру раздела,
 * остаток распределяется по наибольшим дробным частям.
 */
export function allocate(sizes: number[], count: number): number[] {
  const total = sizes.reduce((a, b) => a + b, 0);
  const n = Math.max(0, Math.min(count, total));
  const exact = sizes.map((s) => (total ? (s * n) / total : 0));
  const result = exact.map(Math.floor);
  let rest = n - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || sizes[b.i] - sizes[a.i]);
  for (const { i } of order) {
    if (rest === 0) break;
    if (result[i] < sizes[i]) {
      result[i]++;
      rest--;
    }
  }
  return result;
}

/** Случайный билет: вопросы идут по разделам и по возрастанию номера, как в PDF */
export function makeTicket(
  questions: readonly Question[],
  sections: readonly string[],
  count: number,
  rng: Rng = Math.random,
): number[] {
  const bySection = sections.map((s) => questions.filter((q) => q.section === s));
  const quota = allocate(bySection.map((qs) => qs.length), count);
  return bySection.flatMap((qs, i) =>
    shuffle(qs, rng)
      .slice(0, quota[i])
      .map((q) => q.id)
      .sort((a, b) => a - b),
  );
}

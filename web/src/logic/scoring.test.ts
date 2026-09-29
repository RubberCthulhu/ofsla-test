import { describe, expect, it } from 'vitest';
import { matching, multiple, single } from './fixtures';
import { isAnswered, isCorrect } from './scoring';

describe('isCorrect', () => {
  it('single', () => {
    expect(isCorrect(single, [2])).toBe(true);
    expect(isCorrect(single, [1])).toBe(false);
    expect(isCorrect(single, [2, 1])).toBe(false);
  });

  it('multiple: только точное совпадение множества', () => {
    expect(isCorrect(multiple, [3, 1])).toBe(true);
    expect(isCorrect(multiple, [1])).toBe(false);
    expect(isCorrect(multiple, [1, 3, 4])).toBe(false);
  });

  it('matching: все пары, частично верно = неверно', () => {
    expect(isCorrect(matching, { '1': 3, '2': 1 })).toBe(true);
    expect(isCorrect(matching, { '1': 3, '2': 2 })).toBe(false);
    expect(isCorrect(matching, { '1': 3 })).toBe(false);
  });

  it('без ответа — неверно', () => {
    expect(isCorrect(single, undefined)).toBe(false);
    expect(isCorrect(single, [])).toBe(false);
    expect(isCorrect(matching, {})).toBe(false);
  });
});

describe('isAnswered', () => {
  it('различает тип ответа', () => {
    expect(isAnswered(single, [1])).toBe(true);
    expect(isAnswered(matching, [1])).toBe(false);
    expect(isAnswered(matching, { '1': 2 })).toBe(true);
  });
});

import type { ChoiceQuestion, MatchingQuestion } from '../data/types';

export const single: ChoiceQuestion = {
  id: 1, section: 'A', type: 'single', text: 'q1', image: null,
  options: [{ id: 1, text: 'a' }, { id: 2, text: 'b' }, { id: 3, text: 'c' }],
  correct: [2],
};

export const multiple: ChoiceQuestion = {
  id: 2, section: 'A', type: 'multiple', text: 'q2', image: null,
  options: [{ id: 1, text: 'a' }, { id: 2, text: 'b' }, { id: 3, text: 'c' }, { id: 4, text: 'd' }],
  correct: [1, 3],
};

export const matching: MatchingQuestion = {
  id: 3, section: 'B', type: 'matching', text: 'q3', image: null, columns: null,
  items: [{ id: 1, text: 'x' }, { id: 2, text: 'y' }],
  options: [{ id: 1, text: 'a' }, { id: 2, text: 'b' }, { id: 3, text: 'c' }],
  correct: { '1': 3, '2': 1 },
};

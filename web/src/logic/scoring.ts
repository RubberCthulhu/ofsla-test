import type { Answer, Question } from '../data/types';

export function isAnswered(q: Question, answer: Answer | undefined): boolean {
  if (answer === undefined) return false;
  if (q.type === 'matching') {
    return !Array.isArray(answer) && Object.keys(answer).length > 0;
  }
  return Array.isArray(answer) && answer.length > 0;
}

/** Верен ли ответ целиком: частичного зачёта нет, как на экзамене (1 балл за вопрос) */
export function isCorrect(q: Question, answer: Answer | undefined): boolean {
  if (!isAnswered(q, answer)) return false;
  if (q.type === 'matching') {
    const given = answer as Record<string, number>;
    return q.items.every((item) => given[String(item.id)] === q.correct[String(item.id)]);
  }
  const given = new Set(answer as number[]);
  return given.size === q.correct.length && q.correct.every((id) => given.has(id));
}

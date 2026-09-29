import { MASTERY_STREAK } from '../config';
import type { Question } from '../data/types';

export interface QuestionProgress {
  attempts: number;
  correct: number;
  /** Результаты последних ответов, самый новый — последний */
  last: boolean[];
  updatedAt: number;
}

export type Progress = Record<string, QuestionProgress>;

export function recordAnswer(prev: QuestionProgress | undefined, ok: boolean, now: number): QuestionProgress {
  const p = prev ?? { attempts: 0, correct: 0, last: [], updatedAt: 0 };
  return {
    attempts: p.attempts + 1,
    correct: p.correct + (ok ? 1 : 0),
    last: [...p.last, ok].slice(-MASTERY_STREAK),
    updatedAt: now,
  };
}

export function isMastered(p: QuestionProgress | undefined): boolean {
  return !!p && p.last.length >= MASTERY_STREAK && p.last.every(Boolean);
}

export interface SectionStats {
  section: string;
  total: number;
  answered: number;
  mastered: number;
  attempts: number;
  correct: number;
}

export function sectionStats(
  questions: readonly Question[],
  sections: readonly string[],
  progress: Progress,
): SectionStats[] {
  return sections.map((section) => {
    const s: SectionStats = { section, total: 0, answered: 0, mastered: 0, attempts: 0, correct: 0 };
    for (const q of questions) {
      if (q.section !== section) continue;
      const p = progress[q.id];
      s.total++;
      if (!p) continue;
      s.answered++;
      s.attempts += p.attempts;
      s.correct += p.correct;
      if (isMastered(p)) s.mastered++;
    }
    return s;
  });
}

export function totals(stats: readonly SectionStats[]): Omit<SectionStats, 'section'> {
  return stats.reduce(
    (a, s) => ({
      total: a.total + s.total,
      answered: a.answered + s.answered,
      mastered: a.mastered + s.mastered,
      attempts: a.attempts + s.attempts,
      correct: a.correct + s.correct,
    }),
    { total: 0, answered: 0, mastered: 0, attempts: 0, correct: 0 },
  );
}

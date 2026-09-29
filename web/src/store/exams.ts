import { EXAM_HISTORY_LIMIT } from '../config';
import type { Answer } from '../data/types';
import { load, remove, save } from './storage';

export interface ExamState {
  ticket: number[];
  answers: Record<string, Answer>;
  startedAt: number;
  durationSec: number;
  passPercent: number;
  current: number;
  /** Задан, если варианты перемешиваются */
  shuffleSeed?: number;
}

export interface ExamResult {
  id: string;
  finishedAt: number;
  spentSec: number;
  passPercent: number;
  ticket: number[];
  answers: Record<string, Answer>;
  correctIds: number[];
}

export function getExamInProgress(): ExamState | null {
  return load<ExamState | null>('examInProgress', null);
}

export function saveExamInProgress(state: ExamState): void {
  save('examInProgress', state);
}

export function clearExamInProgress(): void {
  remove('examInProgress');
}

export function getExamHistory(): ExamResult[] {
  return load<ExamResult[]>('exams', []);
}

export function addExamResult(r: ExamResult): void {
  save('exams', [r, ...getExamHistory()].slice(0, EXAM_HISTORY_LIMIT));
}

export function clearExamHistory(): void {
  remove('exams');
}

export function percent(r: Pick<ExamResult, 'ticket' | 'correctIds'>): number {
  return r.ticket.length ? Math.round((r.correctIds.length / r.ticket.length) * 100) : 0;
}

export function isPassed(r: ExamResult): boolean {
  return r.ticket.length > 0 && (r.correctIds.length / r.ticket.length) * 100 >= r.passPercent;
}

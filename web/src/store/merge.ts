// Объединение данных двух устройств (локальных и из облака). Чистые функции.

import { EXAM_HISTORY_LIMIT } from '../config';
import type { Progress } from '../logic/stats';
import type { ExamResult, ExamState } from './exams';

/** По каждому вопросу берётся более свежая запись; записи до сброса прогресса отбрасываются */
export function mergeProgress(a: Progress | null, b: Progress | null, resetAt: number): Progress {
  const out: Progress = {};
  for (const src of [a ?? {}, b ?? {}]) {
    for (const [id, p] of Object.entries(src)) {
      if (p.updatedAt <= resetAt) continue;
      if (!out[id] || out[id].updatedAt < p.updatedAt) out[id] = p;
    }
  }
  return out;
}

export function mergeExams(a: ExamResult[] | null, b: ExamResult[] | null, resetAt: number): ExamResult[] {
  const byId = new Map<string, ExamResult>();
  for (const r of [...(a ?? []), ...(b ?? [])]) {
    if (r.finishedAt > resetAt) byId.set(r.id, r);
  }
  return [...byId.values()].sort((x, y) => y.finishedAt - x.finishedAt).slice(0, EXAM_HISTORY_LIMIT);
}

/**
 * Незавершённый экзамен. Если облако уже синхронизировалось раньше, оно главное:
 * отсутствие экзамена в облаке значит, что он завершён на другом устройстве.
 */
export function mergeExamInProgress(
  local: ExamState | null,
  cloud: ExamState | null,
  cloudInitialized: boolean,
): ExamState | null {
  if (local && cloud) return local.startedAt >= cloud.startedAt ? local : cloud;
  return cloudInitialized ? cloud : local;
}

/** Делит строку на куски: у CloudStorage ограничение 4096 символов на значение */
export function chunk(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : [''];
}

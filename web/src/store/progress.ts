import { recordAnswer, type Progress } from '../logic/stats';
import { load, remove, save } from './storage';

export function getProgress(): Progress {
  return load<Progress>('progress', {});
}

export function recordResults(results: { id: number; ok: boolean }[]): void {
  const progress = getProgress();
  const now = Date.now();
  for (const { id, ok } of results) {
    progress[id] = recordAnswer(progress[id], ok, now);
  }
  save('progress', progress);
}

/** Сбрасывает прогресс; метка времени нужна, чтобы при синхронизации не вернулись записи с других устройств */
export function resetProgress(): void {
  remove('progress');
  save('resetAt', Date.now());
}

export function getResetAt(): number {
  return load<number>('resetAt', 0);
}

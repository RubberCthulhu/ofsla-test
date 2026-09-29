// Синхронизация localStorage <-> Telegram CloudStorage.
// Значение ключа хранится кусками: `<key>__n` — число кусков, `<key>__0..n-1` — сами куски.

import type { ExamResult, ExamState } from './exams';
import { chunk, mergeExamInProgress, mergeExams, mergeProgress } from './merge';
import type { Progress } from '../logic/stats';
import { loadRaw, saveRaw, setChangeListener } from './storage';

export interface CloudBackend {
  getKeys(): Promise<string[]>;
  getItems(keys: string[]): Promise<Record<string, string>>;
  setItem(key: string, value: string): Promise<void>;
  removeItems(keys: string[]): Promise<void>;
}

const SYNCED = ['settings', 'progress', 'exams', 'examInProgress', 'resetAt'] as const;
type SyncedKey = (typeof SYNCED)[number];

const CHUNK_SIZE = 4000;
const PUSH_DELAY_MS = 1000;
/** Метка, что облако уже хоть раз синхронизировалось */
const INIT_KEY = 'sync__v';

const chunkCount = new Map<string, number>();

function parse<T>(raw: string | null | undefined): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readCloud(values: Record<string, string>, key: string): string | null {
  const n = Number(values[`${key}__n`]);
  if (!Number.isInteger(n) || n <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const part = values[`${key}__${i}`];
    if (part === undefined) return null; // запись оборвалась на середине — считаем, что её нет
    parts.push(part);
  }
  chunkCount.set(key, n);
  return parts.join('');
}

/** Объединяет локальные данные с облачными; возвращает ключи, которые нужно отправить в облако */
export async function hydrate(backend: CloudBackend): Promise<SyncedKey[]> {
  const keys = await backend.getKeys();
  const values = keys.length ? await backend.getItems(keys) : {};
  const initialized = values[INIT_KEY] !== undefined;
  const cloud = Object.fromEntries(SYNCED.map((k) => [k, readCloud(values, k)])) as Record<SyncedKey, string | null>;
  const local = Object.fromEntries(SYNCED.map((k) => [k, loadRaw(k)])) as Record<SyncedKey, string | null>;

  const resetAt = Math.max(parse<number>(local.resetAt) ?? 0, parse<number>(cloud.resetAt) ?? 0);
  const merged: Record<SyncedKey, unknown> = {
    resetAt: resetAt || null,
    settings: parse(initialized ? (cloud.settings ?? local.settings) : (local.settings ?? cloud.settings)),
    progress: mergeProgress(parse<Progress>(local.progress), parse<Progress>(cloud.progress), resetAt),
    exams: mergeExams(parse<ExamResult[]>(local.exams), parse<ExamResult[]>(cloud.exams), resetAt),
    examInProgress: mergeExamInProgress(
      parse<ExamState>(local.examInProgress),
      parse<ExamState>(cloud.examInProgress),
      initialized,
    ),
  };

  const toPush: SyncedKey[] = [];
  for (const key of SYNCED) {
    const raw = merged[key] == null ? null : JSON.stringify(merged[key]);
    if (raw !== local[key]) saveRaw(key, raw);
    if (raw !== cloud[key]) toPush.push(key);
  }
  if (!initialized) await backend.setItem(INIT_KEY, '1');
  return toPush;
}

async function push(backend: CloudBackend, key: string): Promise<void> {
  const raw = loadRaw(key);
  const prev = chunkCount.get(key) ?? 0;
  const parts = raw === null ? [] : chunk(raw, CHUNK_SIZE);
  // сначала куски, потом счётчик: оборванная запись не даст полуобновлённого значения с новым счётчиком
  for (let i = 0; i < parts.length; i++) await backend.setItem(`${key}__${i}`, parts[i]);
  if (parts.length) await backend.setItem(`${key}__n`, String(parts.length));
  const stale: string[] = [];
  for (let i = parts.length; i < prev; i++) stale.push(`${key}__${i}`);
  if (!parts.length) stale.push(`${key}__n`);
  if (stale.length) await backend.removeItems(stale);
  chunkCount.set(key, parts.length);
}

/** Включает отправку изменений в облако: с задержкой, по одному запросу за раз */
export function startSync(backend: CloudBackend, initialPush: string[]): () => Promise<void> {
  const pending = new Set<string>(initialPush);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chain = Promise.resolve();

  const flush = () => {
    clearTimeout(timer);
    const keys = [...pending];
    pending.clear();
    for (const key of keys) {
      chain = chain.then(() => push(backend, key)).catch((e) => {
        console.warn('Не удалось сохранить в CloudStorage', key, e);
        pending.add(key);
      });
    }
    return chain;
  };
  const schedule = (key: string) => {
    if (!(SYNCED as readonly string[]).includes(key)) return;
    pending.add(key);
    clearTimeout(timer);
    timer = setTimeout(flush, PUSH_DELAY_MS);
  };

  setChangeListener(schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  if (pending.size) timer = setTimeout(flush, PUSH_DELAY_MS);
  return flush;
}

type Callback<T> = (err: string | null, res?: T) => void;
interface TelegramCloudStorage {
  getKeys(cb: Callback<string[]>): void;
  getItems(keys: string[], cb: Callback<Record<string, string>>): void;
  setItem(key: string, value: string, cb: Callback<boolean>): void;
  removeItems(keys: string[], cb: Callback<boolean>): void;
}

/** Промис-обёртка над колбэками CloudStorage с таймаутом: клиент Telegram может не ответить */
export function telegramBackend(cs: TelegramCloudStorage, timeoutMs = 5000): CloudBackend {
  const call = <T>(fn: (cb: Callback<T>) => void) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('CloudStorage: нет ответа')), timeoutMs);
      fn((err, res) => {
        clearTimeout(t);
        if (err) reject(new Error(String(err)));
        else resolve(res as T);
      });
    });
  return {
    getKeys: () => call<string[]>((cb) => cs.getKeys(cb)),
    getItems: (keys) => call<Record<string, string>>((cb) => cs.getItems(keys, cb)),
    setItem: (key, value) => call<boolean>((cb) => cs.setItem(key, value, cb)).then(() => undefined),
    removeItems: (keys) => call<boolean>((cb) => cs.removeItems(keys, cb)).then(() => undefined),
  };
}

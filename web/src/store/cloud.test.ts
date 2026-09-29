import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hydrate, startSync, type CloudBackend } from './cloud';
import { chunk, mergeExamInProgress, mergeExams, mergeProgress } from './merge';
import { load, save } from './storage';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

function memoryBackend(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  const backend: CloudBackend = {
    getKeys: async () => [...data.keys()],
    getItems: async (keys) => Object.fromEntries(keys.filter((k) => data.has(k)).map((k) => [k, data.get(k)!])),
    setItem: async (k, v) => {
      if (v.length > 4096) throw new Error('too long');
      data.set(k, v);
    },
    removeItems: async (keys) => keys.forEach((k) => data.delete(k)),
  };
  return { data, backend };
}

const p = (updatedAt: number, ok = true) => ({ attempts: 1, correct: ok ? 1 : 0, last: [ok], updatedAt });

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal('document', { addEventListener: () => {}, visibilityState: 'visible' });
});

describe('merge', () => {
  it('progress: свежая запись побеждает, до сброса — отбрасывается', () => {
    expect(mergeProgress({ '1': p(10), '2': p(5) }, { '1': p(20, false), '3': p(3) }, 4)).toEqual({
      '1': p(20, false),
      '2': p(5),
    });
  });

  it('exams: объединение по id, новые сверху', () => {
    const e = (id: string, finishedAt: number) => ({ id, finishedAt }) as never;
    expect(mergeExams([e('a', 1), e('b', 3)], [e('b', 3), e('c', 2)], 0).map((r: { id: string }) => r.id))
      .toEqual(['b', 'c', 'a']);
  });

  it('examInProgress: облако главное после первой синхронизации', () => {
    const s = (startedAt: number) => ({ startedAt }) as never;
    expect(mergeExamInProgress(s(1), null, true)).toBeNull();
    expect(mergeExamInProgress(s(1), null, false)).toEqual(s(1));
    expect(mergeExamInProgress(s(1), s(2), true)).toEqual(s(2));
  });

  it('chunk', () => {
    expect(chunk('abcde', 2)).toEqual(['ab', 'cd', 'e']);
    expect(chunk('', 2)).toEqual(['']);
  });
});

describe('hydrate + push', () => {
  it('первый запуск: локальные данные уходят в облако кусками и читаются на другом устройстве', async () => {
    const big: Record<string, ReturnType<typeof p>> = {};
    for (let i = 1; i <= 432; i++) big[i] = p(1000 + i);
    save('progress', big);
    save('settings', { examCount: 10 });

    const { data, backend } = memoryBackend();
    const toPush = await hydrate(backend);
    expect(toPush).toEqual(expect.arrayContaining(['progress', 'settings']));
    await startSync(backend, toPush)();
    expect(Number(data.get('progress__n'))).toBeGreaterThan(1);

    // «другое устройство» с пустым localStorage
    vi.stubGlobal('localStorage', new MemoryStorage());
    const again = await hydrate(backend);
    expect(again).toEqual([]);
    expect(load('progress', {})).toEqual(big);
    expect(load('settings', {})).toEqual({ examCount: 10 });
  });

  it('сброс на одном устройстве не возвращает старые записи с другого', async () => {
    const { backend } = memoryBackend();
    save('progress', { '1': p(100) });
    await startSync(backend, await hydrate(backend))();

    // устройство A сбрасывает прогресс
    vi.stubGlobal('localStorage', new MemoryStorage());
    await hydrate(backend);
    const flush = startSync(backend, []);
    save('progress', {});
    save('resetAt', 200);
    await flush();

    // устройство B со старыми локальными данными
    vi.stubGlobal('localStorage', new MemoryStorage());
    save('progress', { '1': p(100), '2': p(300) });
    await hydrate(backend);
    expect(load('progress', {})).toEqual({ '2': p(300) });
  });
});

describe('storage без localStorage', () => {
  it('работает из памяти', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    });
    save('settings', { examCount: 7 });
    expect(load('settings', {})).toEqual({ examCount: 7 });
  });
});

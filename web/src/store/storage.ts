// Единственная точка доступа к постоянному хранилищу.
// Основное хранилище — localStorage (синхронно). В Telegram изменения дополнительно
// уходят в CloudStorage через слушатель (см. store/cloud.ts).

const PREFIX = 'ofsla:v1:';

type ChangeListener = (key: string) => void;
let listener: ChangeListener | null = null;

export function setChangeListener(fn: ChangeListener | null): void {
  listener = fn;
}

/**
 * Запасное хранилище в памяти: localStorage бывает недоступен (приватный режим,
 * iframe на чужом сайте, переполнение). Тогда данные живут до закрытия страницы,
 * а в Telegram всё равно сохраняются в облаке.
 */
const memory = new Map<string, string | null>();

export function loadRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

/** Запись без уведомления слушателя — для применения данных, пришедших из облака */
export function saveRaw(key: string, raw: string | null): void {
  try {
    if (raw === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
}

export function load<T>(key: string, fallback: T): T {
  const raw = loadRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  saveRaw(key, JSON.stringify(value));
  listener?.(key);
}

export function remove(key: string): void {
  saveRaw(key, null);
  listener?.(key);
}

// Единственная точка доступа к постоянному хранилищу.
// Сейчас — localStorage; позже здесь же появится Telegram CloudStorage.

const PREFIX = 'ofsla:v1:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // приватный режим или переполнение — работаем без сохранения
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // см. save
  }
}

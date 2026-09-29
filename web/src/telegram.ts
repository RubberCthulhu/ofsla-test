// Интеграция с Telegram Mini App. Вне Telegram SDK не загружается и все функции — no-op.

import type WebAppType from '@twa-dev/sdk';

type WebApp = typeof WebAppType;

let tg: WebApp | null = null;

/** Параметры запуска Telegram приходят в hash (#tgWebAppData=...), SDK кэширует их в sessionStorage */
function launchedFromTelegram(): boolean {
  if (location.hash.includes('tgWebAppData')) return true;
  try {
    return (sessionStorage.getItem('__telegram__initParams') ?? '').includes('tgWebAppData');
  } catch {
    return false;
  }
}

export async function initTelegram(): Promise<WebApp | null> {
  if (!launchedFromTelegram()) return null;
  // SDK — CommonJS: после сборки default-экспорт оборачивается дважды, поэтому берём объект,
  // который SDK сам кладёт в window.Telegram
  await import('@twa-dev/sdk');
  const WebApp = (window as unknown as { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;
  if (!WebApp?.initData) return null;
  tg = WebApp;
  applyTheme();
  WebApp.onEvent('themeChanged', applyTheme);
  WebApp.ready();
  WebApp.expand();
  // свайп вниз при прокрутке длинного вопроса не должен закрывать приложение
  if (WebApp.isVersionAtLeast('7.7')) WebApp.disableVerticalSwipes();
  return tg;
}

export function getTelegram(): WebApp | null {
  return tg;
}

export function hasCloudStorage(): boolean {
  return !!tg && tg.isVersionAtLeast('6.9');
}

function applyTheme() {
  if (!tg) return;
  const p = tg.themeParams;
  const root = document.documentElement;
  root.dataset.theme = tg.colorScheme;
  const vars: Record<string, string | undefined> = {
    '--bg': p.secondary_bg_color,
    '--surface': p.bg_color,
    '--text': p.text_color,
    '--muted': p.hint_color,
    '--accent': p.button_color,
    '--accent-text': p.button_text_color,
    // section_separator_color есть в Bot API 7.0+, но не в типах SDK
    '--border': (p as unknown as Record<string, string | undefined>).section_separator_color,
  };
  for (const [name, value] of Object.entries(vars)) {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
  if (p.button_color) {
    root.style.setProperty('--accent-soft', `color-mix(in srgb, ${p.button_color} 18%, ${p.bg_color ?? 'transparent'})`);
  }
  if (p.secondary_bg_color) {
    tg.setHeaderColor('secondary_bg_color');
    tg.setBackgroundColor('secondary_bg_color');
  }
}

/** Системная кнопка «Назад» Telegram; возвращает функцию снятия обработчика */
export function showBackButton(onClick: () => void): () => void {
  if (!tg) return () => {};
  const bb = tg.BackButton;
  bb.onClick(onClick);
  bb.show();
  return () => {
    bb.offClick(onClick);
    bb.hide();
  };
}

export function haptic(kind: 'success' | 'error' | 'warning'): void {
  if (tg?.isVersionAtLeast('6.1')) tg.HapticFeedback.notificationOccurred(kind);
}

/** Спрашивать подтверждение при закрытии (во время экзамена) */
export function setClosingConfirmation(on: boolean): void {
  if (!tg?.isVersionAtLeast('6.2')) return;
  if (on) tg.enableClosingConfirmation();
  else tg.disableClosingConfirmation();
}

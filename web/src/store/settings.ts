import { DEFAULT_SETTINGS, type Settings } from '../config';
import { load, save } from './storage';

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('settings', {}) };
}

export function setSettings(s: Settings): void {
  save('settings', s);
}

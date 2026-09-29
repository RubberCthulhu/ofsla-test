export interface Settings {
  examCount: number;
  examMinutes: number;
  passPercent: number;
  /** Перемешивать варианты ответа при показе */
  shuffleOptions: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  examCount: 40,
  examMinutes: 45,
  passPercent: 90,
  shuffleOptions: false,
};

/** Вопрос считается освоенным, если столько последних ответов подряд верны */
export const MASTERY_STREAK = 2;

export const EXAM_HISTORY_LIMIT = 20;

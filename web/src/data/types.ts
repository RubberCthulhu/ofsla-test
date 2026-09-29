// Контракт data/questions.json (см. README.md, «Формат data/questions.json»)

export type QuestionType = 'single' | 'multiple' | 'matching';

export interface Choice {
  id: number;
  text: string;
}

interface QuestionBase {
  id: number;
  section: string;
  text: string;
  /** Путь относительно data/, например "img/q92.png" */
  image: string | null;
  options: Choice[];
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'single' | 'multiple';
  correct: number[];
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  columns: [string, string] | null;
  items: Choice[];
  /** id пункта (строкой) -> id варианта */
  correct: Record<string, number>;
}

export type Question = ChoiceQuestion | MatchingQuestion;

export interface QuestionBank {
  source: string;
  title: string;
  sections: string[];
  questions: Question[];
}

/** Ответ пользователя: выбранные варианты или сопоставление "id пункта -> id варианта" */
export type Answer = number[] | Record<string, number>;

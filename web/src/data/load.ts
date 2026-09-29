import type { Question, QuestionBank } from './types';

function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`questions.json: ${msg}`);
}

function validate(bank: QuestionBank) {
  check(Array.isArray(bank.sections) && bank.sections.length > 0, 'нет разделов');
  check(Array.isArray(bank.questions) && bank.questions.length > 0, 'нет вопросов');
  for (const q of bank.questions as Question[]) {
    const where = `вопрос №${q.id}`;
    check(bank.sections.includes(q.section), `${where}: неизвестный раздел`);
    check(typeof q.text === 'string' && q.options?.length >= 2, `${where}: нет текста или вариантов`);
    if (q.type === 'matching') {
      check(q.items?.length > 0 && typeof q.correct === 'object', `${where}: неполное сопоставление`);
    } else {
      check(
        (q.type === 'single' || q.type === 'multiple') && Array.isArray(q.correct),
        `${where}: неизвестный тип или ключ`,
      );
    }
  }
}

export async function loadBank(): Promise<QuestionBank> {
  const resp = await fetch(`${import.meta.env.BASE_URL}questions.json`);
  if (!resp.ok) throw new Error(`Не удалось загрузить вопросы: HTTP ${resp.status}`);
  const bank = (await resp.json()) as QuestionBank;
  validate(bank);
  return bank;
}

export function imageUrl(q: Question): string | null {
  return q.image ? `${import.meta.env.BASE_URL}${q.image}` : null;
}

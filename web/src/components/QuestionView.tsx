import { useMemo } from 'preact/hooks';
import { imageUrl } from '../data/load';
import type { Answer, ChoiceQuestion, MatchingQuestion, Question } from '../data/types';
import { seeded, shuffle } from '../logic/random';
import { ImageZoom } from './ImageZoom';

interface Props {
  question: Question;
  answer: Answer | undefined;
  onChange?: (answer: Answer) => void;
  /** Показать правильный ответ и заблокировать ввод */
  review?: boolean;
  /** Показать подсказку «несколько правильных ответов» */
  hintMultiple?: boolean;
  /** Если задан — варианты перемешиваются, порядок стабилен для пары (seed, id вопроса) */
  shuffleSeed?: number;
}

export function QuestionView(props: Props) {
  const { question: q } = props;
  const img = imageUrl(q);
  return (
    <article class="question">
      <div class="q-meta">
        №{q.id} · {q.section}
      </div>
      {img && <ImageZoom src={img} alt={`Рисунок к вопросу №${q.id}`} />}
      <h2 class="q-text">{q.text}</h2>
      {q.type === 'matching' ? <Matching {...props} question={q} /> : <Choices {...props} question={q} />}
    </article>
  );
}

function useOrder<T extends { id: number }>(items: T[], qid: number, seed: number | undefined): T[] {
  return useMemo(
    () => (seed === undefined ? items : shuffle(items, seeded(seed * 1000 + qid))),
    [items, qid, seed],
  );
}

function Choices({ question: q, answer, onChange, review, hintMultiple, shuffleSeed }:
  Props & { question: ChoiceQuestion }) {
  const chosen = Array.isArray(answer) ? answer : [];
  // как на экзамене: один ответ — радиокнопки, несколько — чекбоксы
  const multi = q.type === 'multiple';
  const options = useOrder(q.options, q.id, shuffleSeed);

  const toggle = (id: number) => {
    if (!onChange || review) return;
    if (!multi) return onChange([id]);
    onChange(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].sort((a, b) => a - b));
  };

  return (
    <>
      {hintMultiple && q.type === 'multiple' && <p class="hint">Несколько правильных ответов</p>}
      <ul class="options">
        {options.map((o) => {
          const isChosen = chosen.includes(o.id);
          const isRight = q.correct.includes(o.id);
          const cls = review ? (isRight ? 'right' : isChosen ? 'wrong' : '') : isChosen ? 'chosen' : '';
          return (
            <li key={o.id}>
              <label class={`option ${cls}`}>
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={`q${q.id}`}
                  checked={isChosen}
                  disabled={review}
                  onChange={() => toggle(o.id)}
                />
                <span>{o.text}</span>
                {review && isChosen && <span class="mark">{isRight ? '✓' : '✗'}</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Matching({ question: q, answer, onChange, review, shuffleSeed }: Props & { question: MatchingQuestion }) {
  const given = answer && !Array.isArray(answer) ? answer : {};
  const options = useOrder(q.options, q.id, shuffleSeed);
  const text = (id: number | undefined) => q.options.find((o) => o.id === id)?.text;

  const set = (itemId: number, value: string) => {
    if (!onChange || review) return;
    const next = { ...given };
    if (value) next[itemId] = Number(value);
    else delete next[itemId];
    onChange(next);
  };

  return (
    <>
      <p class="hint">Сопоставьте каждый пункт с названием</p>
      {q.columns && (
        <div class="match-head">
          <span>{q.columns[0]}</span>
          <span>{q.columns[1]}</span>
        </div>
      )}
      <ul class="matching">
        {q.items.map((item) => {
          const value = given[item.id];
          const right = q.correct[item.id];
          const cls = review ? (value === right ? 'right' : 'wrong') : '';
          return (
            <li key={item.id} class={`match-row ${cls}`}>
              <span class="match-item">{item.text}</span>
              <select
                value={value ?? ''}
                disabled={review}
                onChange={(e) => set(item.id, (e.target as HTMLSelectElement).value)}
                aria-label={`Пункт ${item.text}`}
              >
                <option value="">— выберите —</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.text}</option>
                ))}
              </select>
              {review && value !== right && <span class="match-correct">Верно: {text(right)}</span>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

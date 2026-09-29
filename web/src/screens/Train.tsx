import { useMemo, useState } from 'preact/hooks';
import { Page } from '../components/Page';
import { QuestionView } from '../components/QuestionView';
import type { Answer, QuestionBank } from '../data/types';
import { shuffle } from '../logic/random';
import { isAnswered, isCorrect } from '../logic/scoring';
import { isMastered } from '../logic/stats';
import { href } from '../router';
import { getProgress, recordResults } from '../store/progress';
import { getSettings } from '../store/settings';
import { haptic } from '../telegram';

interface Props {
  bank: QuestionBank;
  query: URLSearchParams;
}

export function Train({ bank, query }: Props) {
  const sectionKey = query.get('section') ?? 'all';
  const section = sectionKey === 'all' ? null : bank.sections[Number(sectionKey)];
  const title = section ?? 'Все разделы';

  // список фиксируется на время сессии
  const [{ ids, seed }] = useState(() => {
    const progress = getProgress();
    let qs = bank.questions.filter((q) => !section || q.section === section);
    if (query.get('only') === 'unmastered') qs = qs.filter((q) => !isMastered(progress[q.id]));
    if (query.get('order') === 'rand') qs = shuffle(qs);
    return { ids: qs.map((q) => q.id), seed: getSettings().shuffleOptions ? Date.now() % 100000 : undefined };
  });
  const byId = useMemo(() => new Map(bank.questions.map((q) => [q.id, q])), [bank]);

  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<Answer | undefined>();
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState({ right: 0, done: 0 });

  if (ids.length === 0) {
    return (
      <Page title={title} back="train">
        <p>В этом разделе все вопросы уже освоены.</p>
        <a class="btn primary" href={href('train')}>К разделам</a>
      </Page>
    );
  }

  if (idx >= ids.length) {
    return (
      <Page title={title} back="train">
        <section class="card result">
          <p class="big-number">{score.right} / {score.done}</p>
          <p>верных ответов</p>
        </section>
        <a class="btn primary" href={href('train')}>К разделам</a>
      </Page>
    );
  }

  const q = byId.get(ids[idx])!;
  const ok = checked && isCorrect(q, answer);

  const check = () => {
    const right = isCorrect(q, answer);
    recordResults([{ id: q.id, ok: right }]);
    haptic(right ? 'success' : 'error');
    setScore((s) => ({ right: s.right + (right ? 1 : 0), done: s.done + 1 }));
    setChecked(true);
  };
  const next = () => {
    setIdx(idx + 1);
    setAnswer(undefined);
    setChecked(false);
  };

  return (
    <Page title={title} back="train" right={<span class="counter">{idx + 1} / {ids.length}</span>}>
      <QuestionView
        key={q.id}
        question={q}
        answer={answer}
        onChange={setAnswer}
        review={checked}
        hintMultiple
        shuffleSeed={seed}
      />
      {checked && <p class={`verdict ${ok ? 'right' : 'wrong'}`}>{ok ? 'Верно' : 'Неверно'}</p>}
      <div class="actions">
        {checked ? (
          <button type="button" class="btn primary" onClick={next}>Далее</button>
        ) : (
          <>
            <button type="button" class="btn" onClick={next}>Пропустить</button>
            <button type="button" class="btn primary" disabled={!isAnswered(q, answer)} onClick={check}>
              Ответить
            </button>
          </>
        )}
      </div>
    </Page>
  );
}

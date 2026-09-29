import { useEffect, useMemo, useState } from 'preact/hooks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Page } from '../components/Page';
import { QuestionView } from '../components/QuestionView';
import { Timer } from '../components/Timer';
import type { Answer, QuestionBank } from '../data/types';
import { isAnswered, isCorrect } from '../logic/scoring';
import { makeTicket } from '../logic/ticket';
import { navigate } from '../router';
import {
  addExamResult,
  clearExamInProgress,
  getExamInProgress,
  saveExamInProgress,
  type ExamState,
} from '../store/exams';
import { recordResults } from '../store/progress';
import { getSettings } from '../store/settings';
import { haptic, setClosingConfirmation } from '../telegram';

export function Exam({ bank }: { bank: QuestionBank }) {
  const [state, setState] = useState<ExamState | null>(getExamInProgress);

  if (!state) return <ExamIntro bank={bank} onStart={setState} />;
  return <ExamRun bank={bank} state={state} setState={setState} />;
}

function ExamIntro({ bank, onStart }: { bank: QuestionBank; onStart: (s: ExamState) => void }) {
  const s = getSettings();
  const count = Math.min(s.examCount, bank.questions.length);
  const start = () => {
    const now = Date.now();
    const state: ExamState = {
      ticket: makeTicket(bank.questions, bank.sections, count),
      answers: {},
      startedAt: now,
      durationSec: s.examMinutes * 60,
      passPercent: s.passPercent,
      current: 0,
      shuffleSeed: s.shuffleOptions ? now % 100000 : undefined,
    };
    saveExamInProgress(state);
    onStart(state);
  };
  return (
    <Page title="Пробный экзамен">
      <section class="card">
        <ul class="facts">
          <li><strong>{count}</strong> вопросов из всех разделов</li>
          <li><strong>{s.examMinutes}</strong> минут</li>
          <li>Для сдачи нужно <strong>{s.passPercent}%</strong> верных ответов</li>
        </ul>
        <p class="muted small">
          Как на настоящем экзамене: у вопросов с несколькими правильными ответами — квадратные флажки, вопросы можно пропускать и
          возвращаться к ним. Правильные ответы покажем после завершения. Параметры меняются в настройках.
        </p>
      </section>
      <div class="actions">
        <button type="button" class="btn primary big" onClick={start}>Начать</button>
      </div>
    </Page>
  );
}

interface RunProps {
  bank: QuestionBank;
  state: ExamState;
  setState: (s: ExamState) => void;
}

function ExamRun({ bank, state, setState }: RunProps) {
  const byId = useMemo(() => new Map(bank.questions.map((q) => [q.id, q])), [bank]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setClosingConfirmation(true);
    return () => setClosingConfirmation(false);
  }, []);
  const questions = state.ticket.map((id) => byId.get(id)!);
  const q = questions[state.current];
  const unanswered = questions.filter((x) => !isAnswered(x, state.answers[x.id])).length;

  const update = (patch: Partial<ExamState>) => {
    const next = { ...state, ...patch };
    saveExamInProgress(next);
    setState(next);
  };
  const setAnswer = (a: Answer) => update({ answers: { ...state.answers, [q.id]: a } });
  const go = (i: number) => update({ current: Math.max(0, Math.min(questions.length - 1, i)) });

  const finish = () => {
    const answered = questions.filter((x) => isAnswered(x, state.answers[x.id]));
    const correctIds = questions.filter((x) => isCorrect(x, state.answers[x.id])).map((x) => x.id);
    // в прогресс идут только вопросы, на которые дан ответ
    recordResults(answered.map((x) => ({ id: x.id, ok: correctIds.includes(x.id) })));
    const id = String(Date.now());
    const isPassedNow = (correctIds.length / questions.length) * 100 >= state.passPercent;
    addExamResult({
      id,
      finishedAt: Date.now(),
      spentSec: Math.min(state.durationSec, Math.round((Date.now() - state.startedAt) / 1000)),
      passPercent: state.passPercent,
      ticket: state.ticket,
      answers: state.answers,
      correctIds,
    });
    clearExamInProgress();
    haptic(isPassedNow ? 'success' : 'warning');
    navigate(`result/${id}`, undefined, true);
  };

  return (
    <Page
      title={`Вопрос ${state.current + 1} из ${questions.length}`}
      right={<Timer deadline={state.startedAt + state.durationSec * 1000} onExpire={finish} />}
    >
      <nav class="qnav" aria-label="Вопросы билета">
        {questions.map((x, i) => (
          <button
            type="button"
            key={x.id}
            class={`${i === state.current ? 'current' : ''} ${isAnswered(x, state.answers[x.id]) ? 'done' : ''}`}
            onClick={() => go(i)}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <QuestionView
        key={q.id}
        question={q}
        answer={state.answers[q.id]}
        onChange={setAnswer}
        shuffleSeed={state.shuffleSeed}
      />

      <div class="actions">
        <button type="button" class="btn" disabled={state.current === 0} onClick={() => go(state.current - 1)}>
          Назад
        </button>
        {state.current < questions.length - 1 && (
          <button type="button" class="btn primary" onClick={() => go(state.current + 1)}>Далее</button>
        )}
      </div>
      <div class="actions">
        <button type="button" class="btn danger-outline" onClick={() => setConfirm(true)}>Завершить экзамен</button>
      </div>

      {confirm && (
        <ConfirmDialog confirmLabel="Завершить" onConfirm={finish} onCancel={() => setConfirm(false)}>
          <p>Завершить экзамен?</p>
          {unanswered > 0 && <p class="muted">Без ответа: {unanswered}. Они будут засчитаны как неверные.</p>}
        </ConfirmDialog>
      )}
    </Page>
  );
}

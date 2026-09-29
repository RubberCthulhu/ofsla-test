import { useMemo, useState } from 'preact/hooks';
import { Page } from '../components/Page';
import { QuestionView } from '../components/QuestionView';
import { formatDuration } from '../components/Timer';
import type { QuestionBank } from '../data/types';
import { isAnswered } from '../logic/scoring';
import { href } from '../router';
import { getExamHistory, isPassed, percent } from '../store/exams';

export function ExamResultScreen({ bank, id }: { bank: QuestionBank; id: string | undefined }) {
  const result = getExamHistory().find((r) => r.id === id);
  const byId = useMemo(() => new Map(bank.questions.map((q) => [q.id, q])), [bank]);
  const [onlyWrong, setOnlyWrong] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  if (!result) {
    return (
      <Page title="Результат" back="stats">
        <p>Результат не найден.</p>
      </Page>
    );
  }

  const questions = result.ticket.map((qid) => byId.get(qid)!).filter(Boolean);
  const right = new Set(result.correctIds);
  const passed = isPassed(result);
  const bySection = bank.sections
    .map((section) => {
      const qs = questions.filter((q) => q.section === section);
      return { section, total: qs.length, right: qs.filter((q) => right.has(q.id)).length };
    })
    .filter((s) => s.total > 0);
  const shown = questions.filter((q) => !onlyWrong || !right.has(q.id));

  return (
    <Page title="Результат экзамена" back="stats">
      <section class={`card result ${passed ? 'pass' : 'fail'}`}>
        <p class="big-number">{percent(result)}%</p>
        <p class="verdict-big">{passed ? 'Экзамен сдан' : 'Экзамен не сдан'}</p>
        <p class="muted">
          Верно {result.correctIds.length} из {result.ticket.length} · порог {result.passPercent}% · время{' '}
          {formatDuration(result.spentSec)}
        </p>
      </section>

      <table class="by-section">
        <tbody>
          {bySection.map((s) => (
            <tr key={s.section}>
              <td>{s.section}</td>
              <td class="num">{s.right} / {s.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div class="row between">
        <h2 class="h2">Разбор</h2>
        <label class="check">
          <input type="checkbox" checked={onlyWrong} onChange={() => setOnlyWrong(!onlyWrong)} />
          Только ошибки
        </label>
      </div>

      {shown.length === 0 && <p class="muted">Ошибок нет.</p>}
      <ul class="review-list">
        {shown.map((q) => {
          const ok = right.has(q.id);
          const answered = isAnswered(q, result.answers[q.id]);
          return (
            <li key={q.id} class={ok ? 'right' : 'wrong'}>
              <button type="button" class="review-head" onClick={() => setOpen(open === q.id ? null : q.id)}>
                <span class="mark">{ok ? '✓' : '✗'}</span>
                <span class="review-text">
                  №{q.id}. {q.text || 'Вопрос по рисунку'}
                  {!answered && <em class="muted"> — без ответа</em>}
                </span>
              </button>
              {open === q.id && <QuestionView question={q} answer={result.answers[q.id]} review />}
            </li>
          );
        })}
      </ul>

      <div class="actions">
        <a class="btn" href={href('')}>На главную</a>
        <a class="btn primary" href={href('exam')}>Новый экзамен</a>
      </div>
    </Page>
  );
}

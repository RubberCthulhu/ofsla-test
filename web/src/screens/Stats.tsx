import { useState } from 'preact/hooks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Page } from '../components/Page';
import { ProgressBar } from '../components/ProgressBar';
import type { QuestionBank } from '../data/types';
import { sectionStats, totals } from '../logic/stats';
import { href } from '../router';
import { clearExamHistory, getExamHistory, isPassed, percent } from '../store/exams';
import { getProgress, resetProgress } from '../store/progress';

const dateFmt = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

export function Stats({ bank }: { bank: QuestionBank }) {
  const [, rerender] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const stats = sectionStats(bank.questions, bank.sections, getProgress());
  const all = totals(stats);
  const exams = getExamHistory();
  const accuracy = (s: { attempts: number; correct: number }) =>
    s.attempts ? `${Math.round((s.correct / s.attempts) * 100)}%` : '—';

  const reset = () => {
    resetProgress();
    clearExamHistory();
    setConfirm(false);
    rerender((x) => x + 1);
  };

  return (
    <Page title="Статистика">
      <section class="card">
        <div class="row between">
          <span>Освоено</span>
          <strong>{all.mastered} из {all.total}</strong>
        </div>
        <ProgressBar value={all.mastered} secondary={all.answered} max={all.total} />
        <p class="muted small">
          Отвечено хотя бы раз: {all.answered} · верных ответов: {accuracy(all)}
        </p>
      </section>

      <ul class="sections">
        {stats.map((s) => (
          <li key={s.section} class="card">
            <div class="row between">
              <span class="section-title">{s.section}</span>
              <span class="muted small">{s.mastered}/{s.total}</span>
            </div>
            <ProgressBar value={s.mastered} secondary={s.answered} max={s.total} />
            <p class="muted small">Отвечено: {s.answered} · верных: {accuracy(s)}</p>
          </li>
        ))}
      </ul>

      <h2 class="h2">Пробные экзамены</h2>
      {exams.length === 0 && <p class="muted">Пока не было.</p>}
      <ul class="history">
        {exams.map((r) => (
          <li key={r.id}>
            <a href={href(`result/${r.id}`)} class={isPassed(r) ? 'pass' : 'fail'}>
              <span>{dateFmt.format(r.finishedAt)}</span>
              <span>{r.correctIds.length}/{r.ticket.length}</span>
              <strong>{percent(r)}%</strong>
            </a>
          </li>
        ))}
      </ul>

      <div class="actions">
        <button type="button" class="btn danger-outline" onClick={() => setConfirm(true)}>Сбросить прогресс</button>
      </div>
      {confirm && (
        <ConfirmDialog danger confirmLabel="Сбросить" onConfirm={reset} onCancel={() => setConfirm(false)}>
          <p>Удалить весь прогресс и историю экзаменов? Это нельзя отменить.</p>
        </ConfirmDialog>
      )}
    </Page>
  );
}

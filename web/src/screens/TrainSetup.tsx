import { useState } from 'preact/hooks';
import { Page } from '../components/Page';
import { ProgressBar } from '../components/ProgressBar';
import type { QuestionBank } from '../data/types';
import { sectionStats, totals } from '../logic/stats';
import { navigate } from '../router';
import { getProgress } from '../store/progress';

export function TrainSetup({ bank }: { bank: QuestionBank }) {
  const stats = sectionStats(bank.questions, bank.sections, getProgress());
  const all = totals(stats);
  const [order, setOrder] = useState<'seq' | 'rand'>('seq');
  const [onlyNew, setOnlyNew] = useState(false);

  const start = (section: string) =>
    navigate('train/run', { section, order, only: onlyNew ? 'unmastered' : 'all' });

  const rows = [{ key: 'all', title: 'Все разделы', ...all }, ...stats.map((s, i) => ({ key: String(i), title: s.section, ...s }))];

  return (
    <Page title="Обучение">
      <section class="card options-card">
        <div class="segmented" role="radiogroup" aria-label="Порядок вопросов">
          <button type="button" class={order === 'seq' ? 'on' : ''} onClick={() => setOrder('seq')}>По порядку</button>
          <button type="button" class={order === 'rand' ? 'on' : ''} onClick={() => setOrder('rand')}>Вперемешку</button>
        </div>
        <label class="check">
          <input type="checkbox" checked={onlyNew} onChange={() => setOnlyNew(!onlyNew)} />
          Только неосвоенные
        </label>
      </section>

      <ul class="sections">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" class="section-btn" onClick={() => start(r.key)}>
              <div class="row between">
                <span class="section-title">{r.title}</span>
                <span class="muted small">{r.mastered}/{r.total}</span>
              </div>
              <ProgressBar value={r.mastered} secondary={r.answered} max={r.total} />
            </button>
          </li>
        ))}
      </ul>
    </Page>
  );
}

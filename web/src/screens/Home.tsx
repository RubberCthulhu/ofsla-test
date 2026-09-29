import { ProgressBar } from '../components/ProgressBar';
import type { QuestionBank } from '../data/types';
import { sectionStats, totals } from '../logic/stats';
import { href } from '../router';
import { getExamInProgress } from '../store/exams';
import { getProgress } from '../store/progress';
import { getSettings } from '../store/settings';

export function Home({ bank }: { bank: QuestionBank }) {
  const t = totals(sectionStats(bank.questions, bank.sections, getProgress()));
  const s = getSettings();
  const examRunning = getExamInProgress() !== null;
  return (
    <main class="page home">
      <h1 class="home-title">ОФСЛА: экзамен пилота параплана</h1>
      <p class="muted">{bank.title} · {bank.questions.length} вопросов</p>

      <section class="card">
        <div class="row between">
          <span>Освоено</span>
          <strong>{t.mastered} из {t.total}</strong>
        </div>
        <ProgressBar value={t.mastered} secondary={t.answered} max={t.total} />
        <p class="muted small">Вопрос освоен, если на него дважды подряд ответили верно.</p>
      </section>

      <nav class="menu">
        <a class="btn primary big" href={href('train')}>Обучение по разделам</a>
        <a class="btn big" href={href('exam')}>
          {examRunning ? 'Продолжить экзамен' : 'Пробный экзамен'}
          <span class="sub">{s.examCount} вопросов · {s.examMinutes} мин · порог {s.passPercent}%</span>
        </a>
        <a class="btn big" href={href('stats')}>Статистика</a>
        <a class="btn big" href={href('settings')}>Настройки</a>
      </nav>
    </main>
  );
}

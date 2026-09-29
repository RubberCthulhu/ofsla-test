import { useEffect, useState } from 'preact/hooks';
import { loadBank } from './data/load';
import type { QuestionBank } from './data/types';
import { useRoute } from './router';
import { Exam } from './screens/Exam';
import { ExamResultScreen } from './screens/ExamResult';
import { Home } from './screens/Home';
import { SettingsScreen } from './screens/Settings';
import { Stats } from './screens/Stats';
import { Train } from './screens/Train';
import { TrainSetup } from './screens/TrainSetup';

export function App() {
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();

  useEffect(() => {
    loadBank().then(setBank, (e: Error) => setError(e.message));
  }, []);

  if (error) return <main class="page"><p class="error">{error}</p></main>;
  if (!bank) return <main class="page"><p class="muted">Загрузка вопросов…</p></main>;

  const [screen, arg] = route.path;
  switch (screen) {
    case 'train':
      return arg === 'run' ? <Train key={route.query.toString()} bank={bank} query={route.query} /> : <TrainSetup bank={bank} />;
    case 'exam':
      return <Exam bank={bank} />;
    case 'result':
      return <ExamResultScreen bank={bank} id={arg} />;
    case 'stats':
      return <Stats bank={bank} />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <Home bank={bank} />;
  }
}

import { useEffect, useState } from 'preact/hooks';
import { Page } from '../components/Page';
import { DEFAULT_SETTINGS, type Settings } from '../config';
import { getSettings, setSettings } from '../store/settings';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));

export function SettingsScreen() {
  const [s, setS] = useState<Settings>(getSettings);

  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    setSettings(next);
  };

  return (
    <Page title="Настройки">
      <section class="card form">
        <h2 class="h2">Пробный экзамен</h2>
        <NumberField label="Количество вопросов" value={s.examCount} min={1} max={432}
          onChange={(v) => update({ examCount: v })} />
        <NumberField label="Время, минут" value={s.examMinutes} min={1} max={300}
          onChange={(v) => update({ examMinutes: v })} />
        <NumberField label="Проходной порог, %" value={s.passPercent} min={1} max={100}
          onChange={(v) => update({ passPercent: v })} />
      </section>

      <section class="card form">
        <label class="check">
          <input type="checkbox" checked={s.shuffleOptions} onChange={() => update({ shuffleOptions: !s.shuffleOptions })} />
          Перемешивать варианты ответов
        </label>
        <p class="muted small">Помогает запоминать ответы, а не их положение в списке.</p>
      </section>

      <div class="actions">
        <button type="button" class="btn" onClick={() => update(DEFAULT_SETTINGS)}>По умолчанию</button>
      </div>
    </Page>
  );
}

interface FieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

/** Поле хранит введённый текст, пока пользователь печатает; значение за пределами min..max поправляется при уходе с поля */
function NumberField({ label, value, min, max, onChange }: FieldProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const onInput = (e: Event) => {
    const t = (e.target as HTMLInputElement).value;
    setText(t);
    const v = Number(t);
    if (t !== '' && Number.isInteger(v) && v >= min && v <= max) onChange(v);
  };
  const onBlur = () => {
    const v = Number(text);
    const fixed = text === '' || !Number.isFinite(v) ? value : clamp(v, min, max);
    setText(String(fixed));
    onChange(fixed);
  };

  return (
    <label>
      {label}
      <input type="number" inputMode="numeric" min={min} max={max} value={text} onInput={onInput} onBlur={onBlur} />
    </label>
  );
}

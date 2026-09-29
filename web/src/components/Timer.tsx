import { useEffect, useState } from 'preact/hooks';

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  deadline: number;
  onExpire: () => void;
}

/** Обратный отсчёт до deadline (ms). Считается от часов, а не тиков — не сбивается при сворачивании */
export function Timer({ deadline, onExpire }: Props) {
  const [now, setNow] = useState(Date.now());
  const left = (deadline - now) / 1000;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left <= 0) onExpire();
  }, [left <= 0]);

  return <span class={`timer ${left < 300 ? 'warn' : ''}`}>{formatDuration(left)}</span>;
}

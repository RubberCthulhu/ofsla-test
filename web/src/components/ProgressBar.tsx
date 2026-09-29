interface Props {
  value: number;
  max: number;
  /** Вторая, более светлая полоса (например, «отвечено» под «освоено») */
  secondary?: number;
}

export function ProgressBar({ value, max, secondary }: Props) {
  const pct = (x: number) => `${max ? Math.min(100, (x / max) * 100) : 0}%`;
  return (
    <div class="bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      {secondary !== undefined && <div class="bar-fill secondary" style={{ width: pct(secondary) }} />}
      <div class="bar-fill" style={{ width: pct(value) }} />
    </div>
  );
}

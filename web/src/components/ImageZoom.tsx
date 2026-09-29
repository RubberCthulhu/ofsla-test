import { useEffect, useState } from 'preact/hooks';

export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" class="q-image" onClick={() => setOpen(true)} aria-label="Увеличить рисунок">
        <img src={src} alt={alt} loading="lazy" />
      </button>
      {open && (
        <div class="zoom" role="dialog" aria-label="Рисунок" onClick={() => setOpen(false)}>
          <img src={src} alt={alt} />
          <span class="zoom-hint">Нажмите, чтобы закрыть</span>
        </div>
      )}
    </>
  );
}

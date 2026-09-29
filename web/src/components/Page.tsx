import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { href, navigate } from '../router';
import { getTelegram, showBackButton } from '../telegram';

interface Props {
  title: string;
  /** Куда ведёт «назад»; по умолчанию — на главную */
  back?: string | null;
  right?: ComponentChildren;
  children: ComponentChildren;
}

export function Page({ title, back = '', right, children }: Props) {
  // в Telegram «Назад» — системная кнопка в шапке клиента
  const inTelegram = !!getTelegram();
  useEffect(() => (back === null ? undefined : showBackButton(() => navigate(back))), [back]);

  return (
    <>
      <header class={`topbar ${inTelegram ? 'no-back' : ''}`}>
        {!inTelegram &&
          (back !== null ? <a class="back" href={href(back)} aria-label="Назад">‹</a> : <span class="back" />)}
        <h1>{title}</h1>
        <div class="topbar-right">{right}</div>
      </header>
      <main class="page">{children}</main>
    </>
  );
}

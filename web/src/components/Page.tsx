import type { ComponentChildren } from 'preact';
import { href } from '../router';

interface Props {
  title: string;
  /** Куда ведёт «назад»; по умолчанию — на главную */
  back?: string | null;
  right?: ComponentChildren;
  children: ComponentChildren;
}

export function Page({ title, back = '', right, children }: Props) {
  return (
    <>
      <header class="topbar">
        {back !== null ? <a class="back" href={href(back)} aria-label="Назад">‹</a> : <span class="back" />}
        <h1>{title}</h1>
        <div class="topbar-right">{right}</div>
      </header>
      <main class="page">{children}</main>
    </>
  );
}

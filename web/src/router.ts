import { useEffect, useState } from 'preact/hooks';

export interface Route {
  /** Сегменты пути: "#/result/abc" -> ["result", "abc"] */
  path: string[];
  query: URLSearchParams;
}

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  return { path: path.split('/').filter(Boolean), query: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string>): string {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  return `#/${path}${qs}`;
}

export function navigate(path: string, query?: Record<string, string>, replace = false): void {
  const target = href(path, query);
  if (replace) {
    history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = target;
  }
}

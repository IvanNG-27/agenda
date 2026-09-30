import { createContext, useContext, useEffect, useState, type RefObject } from 'react';

export type Route =
  | { name: 'hoy' }
  | { name: 'semana' }
  | { name: 'calendario'; date?: string }
  | { name: 'tablero' }
  | { name: 'examenes' }
  | { name: 'ajustes' }
  | { name: 'asignatura'; id: string };

export type EditorRequest = {
  kind: 'task' | 'exam';
  /** Si hay id, se edita; si no, se crea */
  id?: string;
  subjectId?: string;
  date?: string;
};

type UI = {
  openEditor: (req: EditorRequest) => void;
  isDesktop: boolean;
};

export const UIContext = createContext<UI>({ openEditor: () => {}, isDesktop: false });
export const useUI = () => useContext(UIContext);

function parse(hash: string): Route {
  const [name, arg] = hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case 'semana':
    case 'tablero':
    case 'examenes':
    case 'ajustes':
      return { name };
    case 'calendario':
      return { name, date: arg || undefined };
    case 'asignatura':
      return arg ? { name, id: decodeURIComponent(arg) } : { name: 'hoy' };
    default:
      return { name: 'hoy' };
  }
}

export function href(r: Route): string {
  if (r.name === 'asignatura') return `#/asignatura/${encodeURIComponent(r.id)}`;
  if (r.name === 'calendario' && r.date) return `#/calendario/${r.date}`;
  return `#/${r.name}`;
}

export const navigate = (r: Route) => {
  window.location.hash = href(r);
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function useMediaQuery(q: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return match;
}

/** Ventana modal: Escape la cierra, Tab no sale de ella, la página de detrás no se desplaza
 *  y, al cerrarla, el foco vuelve a donde estaba. */
export function useModal(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, input, textarea, [tabindex]');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [ref, onClose]);
}

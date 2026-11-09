import { useState } from 'react';
import type { State } from '../data/types';
import { colorCss } from '../lib/rules';

/** Qué calendario se ve: 'todo', 'yo' (solo lo personal) o el id de un grupo. */
export type Scope = string;

const KEY = 'nocta:calendario-vista';

const read = (): Scope => {
  try {
    return localStorage.getItem(KEY) || 'todo';
  } catch {
    return 'todo';
  }
};

/** Deja solo lo del calendario elegido. */
export function scoped(s: State, scope: Scope): State {
  if (scope === 'todo') return s;
  const keep = (x: { group?: string }) => (scope === 'yo' ? !x.group : x.group === scope);
  return {
    ...s,
    subjects: s.subjects.filter(keep),
    tasks: s.tasks.filter(keep),
    exams: s.exams.filter(keep),
    events: s.events.filter(keep),
    notes: s.notes.filter(keep),
  };
}

/** Calendario elegido (se recuerda en este dispositivo). Si era de un grupo que ya no está, vuelve a "Todo". */
export function useScope(state: State): [Scope, (s: Scope) => void] {
  const [scope, setScope] = useState(read);
  const valid = scope === 'todo' || scope === 'yo' || state.groups.some((g) => g.id === scope) ? scope : 'todo';
  const choose = (s: Scope) => {
    setScope(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
  };
  return [valid, choose];
}

/** Botones para elegir calendario. Solo aparecen si la persona está en algún grupo. */
export function ScopePicker({ state, scope, onChange }: { state: State; scope: Scope; onChange: (s: Scope) => void }) {
  if (!state.groups.length) return null;
  const options = [
    { id: 'todo', name: 'Todo', color: 'ink-muted' },
    { id: 'yo', name: 'Mi calendario', color: 'accent' },
    ...state.groups.map((g) => ({ id: g.id, name: g.name, color: g.color })),
  ];
  return (
    <div className="chips scope-picker" role="radiogroup" aria-label="Qué calendario ver">
      {options.map((o) => {
        const on = o.id === scope;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`chip${on ? ' chip--solid' : ''}`}
            style={on ? { background: colorCss(o.color) } : undefined}
            onClick={() => onChange(o.id)}
          >
            {o.id !== 'todo' && <span className="dot dot--6" style={{ background: on ? 'currentColor' : colorCss(o.color) }} />}
            <span className="chip__text">{o.name}</span>
          </button>
        );
      })}
    </div>
  );
}

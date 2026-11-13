import { useState, type ReactNode } from 'react';
import type { State, Subject } from '../data/types';
import { colorCss, colorVar, pendingCount } from '../lib/rules';
import { href, type Route } from '../ui';
import { Icon, type IconName } from './Icons';

const DESKTOP: { name: Route['name']; label: string; icon: IconName }[] = [
  { name: 'hoy', label: 'Hoy', icon: 'hoy' },
  { name: 'calendario', label: 'Calendario', icon: 'calendario' },
  { name: 'tablero', label: 'Tablero', icon: 'tablero' },
  { name: 'examenes', label: 'Exámenes', icon: 'examenes' },
  { name: 'notas', label: 'Notas', icon: 'notas' },
];

const MOBILE: { name: Route['name']; label: string; icon: IconName }[] = [
  { name: 'hoy', label: 'Hoy', icon: 'hoy' },
  { name: 'semana', label: 'Semana', icon: 'semana' },
  { name: 'tablero', label: 'Tablero', icon: 'tablero' },
  { name: 'examenes', label: 'Exámenes', icon: 'examenes' },
  { name: 'notas', label: 'Notas', icon: 'notas' },
];

/** En escritorio la vista "Semana" vive dentro de Calendario, y en móvil al revés. */
const activeName = (r: Route, desktop: boolean): Route['name'] => {
  if (desktop && r.name === 'semana') return 'calendario';
  if (!desktop && r.name === 'calendario') return 'semana';
  return r.name;
};

// ---------- Secciones plegables del lateral ----------

const FOLDS_KEY = 'nocta:menu-plegado';

/** Secciones plegadas ('mias' o el id de un grupo). Se recuerda en este dispositivo. */
function useFolds(): [Set<string>, (id: string) => void] {
  const [closed, setClosed] = useState<Set<string>>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(FOLDS_KEY) ?? '[]');
      return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) => {
    const next = new Set(closed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setClosed(next);
    try {
      localStorage.setItem(FOLDS_KEY, JSON.stringify([...next]));
    } catch {
      /* sin almacenamiento: solo dura mientras está abierta */
    }
  };
  return [closed, toggle];
}

function Fold(props: { id: string; title: string; color?: string; pending: number; open: boolean; onToggle: () => void; children: ReactNode }) {
  const { id, title, color, pending, open, onToggle, children } = props;
  const body = `fold-${id}`;
  return (
    <div className={`fold${open ? ' is-open' : ''}`}>
      <h2 className="section fold__head">
        <button type="button" className="fold__btn" aria-expanded={open} aria-controls={body} onClick={onToggle}>
          {color && <span className="dot dot--6 fold__dot" style={{ background: color }} />}
          <span className="fold__title">{title}</span>
          {!open && pending > 0 && (
            <span className="fold__badge" aria-label={`${pending} pendientes`}>
              {pending}
            </span>
          )}
          <Icon name="der" size={14} className="fold__chev" />
        </button>
      </h2>
      <div className="fold__body" id={body} inert={!open}>
        <div className="fold__inner">{children}</div>
      </div>
    </div>
  );
}

export function Sidebar({ route, state }: { route: Route; state: State }) {
  const active = activeName(route, true);
  const [closed, toggle] = useFolds();
  const pendingOf = (list: Subject[]) => list.reduce((n, s) => n + pendingCount(state.tasks, s.id), 0);
  // Las personales primero; las de cada grupo, bajo su nombre
  const mine = state.subjects.filter((s) => !s.group);
  const row = (s: Subject) => {
    const current = route.name === 'asignatura' && route.id === s.id;
    return (
      <li key={s.id}>
        <a
          className={`subjects__row${current ? ' is-active' : ''}`}
          href={href({ name: 'asignatura', id: s.id })}
          title={s.name}
          aria-current={current ? 'page' : undefined}
        >
          <span className="dot dot--10" style={{ background: colorVar(s) }} />
          <span className="subjects__name">{s.name}</span>
          <span className="subjects__count">{pendingCount(state.tasks, s.id)}</span>
        </a>
      </li>
    );
  };

  return (
    <nav className="sidebar" aria-label="Principal">
      <div className="logo">Nocta</div>
      <ul className="menu">
        {DESKTOP.map((item) => (
          <li key={item.name}>
            <a
              className={`menu__item${active === item.name ? ' is-active' : ''}`}
              href={href({ name: item.name } as Route)}
              aria-current={active === item.name ? 'page' : undefined}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="folds">
        <Fold id="mias" title="Asignaturas" pending={pendingOf(mine)} open={!closed.has('mias')} onToggle={() => toggle('mias')}>
          <ul className="subjects">
            {mine.length === 0 && (
              <li>
                <a className="subjects__row subjects__row--add" href={href({ name: 'ajustes' })}>
                  + Añadir asignaturas
                </a>
              </li>
            )}
            {mine.map(row)}
          </ul>
        </Fold>
        {state.groups.map((g) => {
          const list = state.subjects.filter((s) => s.group === g.id);
          return list.length ? (
            <Fold
              key={g.id}
              id={g.id}
              title={g.name}
              color={colorCss(g.color)}
              pending={pendingOf(list)}
              open={!closed.has(g.id)}
              onToggle={() => toggle(g.id)}
            >
              <ul className="subjects">{list.map(row)}</ul>
            </Fold>
          ) : null;
        })}
      </div>
      <a className={`menu__item menu__item--bottom${active === 'ajustes' ? ' is-active' : ''}`} href={href({ name: 'ajustes' })}>
        <Icon name="ajustes" size={18} />
        Ajustes
      </a>
    </nav>
  );
}

export function TabBar({ route }: { route: Route }) {
  const active = activeName(route, false);
  return (
    <nav className="tabbar" aria-label="Principal">
      {MOBILE.map((item) => (
        <a
          key={item.name}
          className={`tab${active === item.name ? ' is-active' : ''}`}
          href={href({ name: item.name } as Route)}
          aria-current={active === item.name ? 'page' : undefined}
        >
          <Icon name={item.icon} size={22} />
          {item.label}
        </a>
      ))}
    </nav>
  );
}

import type { State } from '../data/types';
import { colorVar, pendingCount } from '../lib/rules';
import { href, type Route } from '../ui';
import { Icon, type IconName } from './Icons';

const DESKTOP: { name: Route['name']; label: string; icon: IconName }[] = [
  { name: 'hoy', label: 'Hoy', icon: 'hoy' },
  { name: 'calendario', label: 'Calendario', icon: 'calendario' },
  { name: 'tablero', label: 'Tablero', icon: 'tablero' },
  { name: 'examenes', label: 'Exámenes', icon: 'examenes' },
];

const MOBILE: { name: Route['name']; label: string; icon: IconName }[] = [
  { name: 'hoy', label: 'Hoy', icon: 'hoy' },
  { name: 'semana', label: 'Semana', icon: 'semana' },
  { name: 'tablero', label: 'Tablero', icon: 'tablero' },
  { name: 'examenes', label: 'Exámenes', icon: 'examenes' },
];

/** En escritorio la vista "Semana" vive dentro de Calendario, y en móvil al revés. */
const activeName = (r: Route, desktop: boolean): Route['name'] => {
  if (desktop && r.name === 'semana') return 'calendario';
  if (!desktop && r.name === 'calendario') return 'semana';
  return r.name;
};

export function Sidebar({ route, state }: { route: Route; state: State }) {
  const active = activeName(route, true);
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
      <h2 className="section">Asignaturas</h2>
      <ul className="subjects">
        {state.subjects.length === 0 && (
          <li>
            <a className="subjects__row subjects__row--add" href={href({ name: 'ajustes' })}>
              + Añadir asignaturas
            </a>
          </li>
        )}
        {state.subjects.map((s) => {
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
        })}
      </ul>
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

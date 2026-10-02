import type { ReactNode } from 'react';
import { useUI } from '../ui';

export function SectionHeader({ children, count, tone }: { children: ReactNode; count?: number; tone?: 'exam' }) {
  return (
    <h2 className={`section${tone === 'exam' ? ' section--exam' : ''}`}>
      {children}
      {count !== undefined && ` · ${count}`}
    </h2>
  );
}

export function Empty({ children = 'Todo hecho por hoy' }: { children?: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Primera vez: aún no hay asignaturas ni eventos. */
export function Welcome() {
  const { openEditor } = useUI();
  return (
    <div className="welcome">
      <h2 className="welcome__title">Empieza a organizarte</h2>
      <p className="welcome__text">
        Añade tus asignaturas para apuntar deberes y exámenes, o apunta ya tus planes: cumpleaños, comidas, quedadas,
        citas…
      </p>
      <div className="welcome__actions">
        <a className="btn welcome__btn" href="#/ajustes">
          Añadir asignaturas
        </a>
        <button type="button" className="btn btn--secondary welcome__btn" onClick={() => openEditor({ kind: 'event' })}>
          Nuevo evento
        </button>
      </div>
    </div>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <div className="list">{children}</div>;
}

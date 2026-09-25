import type { ReactNode } from 'react';

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

/** Primera vez: aún no hay asignaturas, así que no se pueden apuntar tareas ni exámenes. */
export function Welcome() {
  return (
    <div className="welcome">
      <h2 className="welcome__title">Empieza por tus asignaturas</h2>
      <p className="welcome__text">Añade las asignaturas o módulos que tengas. Después podrás apuntar deberes y exámenes de cada una.</p>
      <a className="btn welcome__btn" href="#/ajustes">
        Añadir asignaturas
      </a>
    </div>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <div className="list">{children}</div>;
}

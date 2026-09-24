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

export function List({ children }: { children: ReactNode }) {
  return <div className="list">{children}</div>;
}

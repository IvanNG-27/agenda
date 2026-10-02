import type { ReactNode } from 'react';
import type { State } from '../data/types';
import { useUI, type EditorRequest } from '../ui';
import { SearchBox } from './SearchBox';

export function PageHeader({ kicker, title, children }: { kicker?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="head">
      <div className="head__text">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="display">{title}</h1>
      </div>
      {children && <div className="head__actions">{children}</div>}
    </header>
  );
}

/** Buscador + botón principal de escritorio */
export function DesktopActions({
  state, today, label, req = { kind: 'task' },
}: { state: State; today: string; label?: string; req?: EditorRequest }) {
  const { openEditor } = useUI();
  // Sin asignaturas no hay tareas: el editor se abre en Evento
  const text = label ?? (state.subjects.length ? '+ Nueva tarea' : '+ Nuevo evento');
  return (
    <>
      <SearchBox state={state} today={today} />
      <button type="button" className="btn" onClick={() => openEditor(req)}>
        {text}
      </button>
    </>
  );
}

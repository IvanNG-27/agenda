import { useCallback, useMemo, useState } from 'react';
import { useStore, useToday } from './data/store';
import { Sidebar, TabBar } from './components/Navigation';
import { Editor } from './components/Editor';
import { HoyView } from './views/HoyView';
import { SemanaView } from './views/SemanaView';
import { CalendarView } from './views/CalendarView';
import { TableroView } from './views/TableroView';
import { ExamsView } from './views/ExamsView';
import { SubjectView } from './views/SubjectView';
import { SettingsView } from './views/SettingsView';
import { UIContext, useMediaQuery, useRoute, type EditorRequest } from './ui';

export default function App() {
  const state = useStore();
  const today = useToday();
  const route = useRoute();
  const desktop = useMediaQuery('(min-width: 900px)');
  const [editor, setEditor] = useState<EditorRequest | null>(null);

  const openEditor = useCallback((req: EditorRequest) => setEditor(req), []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const ui = useMemo(() => ({ openEditor, isDesktop: desktop }), [openEditor, desktop]);

  const props = { state, today, desktop };
  let view;
  switch (route.name) {
    case 'semana':
    case 'calendario':
      view = desktop ? (
        <CalendarView
          key={route.name === 'calendario' ? route.date ?? 'hoy' : 'semana'}
          state={state}
          today={today}
          initialDate={route.name === 'calendario' ? route.date : undefined}
          initialMode={route.name === 'semana' ? 'semana' : 'mes'}
        />
      ) : (
        <SemanaView state={state} today={today} />
      );
      break;
    case 'tablero':
      view = <TableroView {...props} />;
      break;
    case 'examenes':
      view = <ExamsView {...props} />;
      break;
    case 'asignatura':
      view = <SubjectView {...props} id={route.id} />;
      break;
    case 'ajustes':
      view = <SettingsView state={state} desktop={desktop} />;
      break;
    default:
      view = <HoyView {...props} />;
  }

  const fabRequest: EditorRequest =
    route.name === 'examenes'
      ? { kind: 'exam' }
      : route.name === 'asignatura'
        ? { kind: 'task', subjectId: route.id }
        : { kind: 'task' };

  return (
    <UIContext.Provider value={ui}>
      {desktop ? (
        <div className="shell">
          <Sidebar route={route} state={state} />
          {view}
        </div>
      ) : (
        <div className="mobile">
          {view}
          {route.name !== 'ajustes' && (
            <button type="button" className="fab" onClick={() => openEditor(fabRequest)} aria-label="Añadir">
              +
            </button>
          )}
          <TabBar route={route} />
        </div>
      )}
      {editor && (
        <Editor
          key={`${editor.kind}-${editor.id ?? 'new'}`}
          req={editor}
          state={state}
          today={today}
          desktop={desktop}
          onClose={closeEditor}
        />
      )}
    </UIContext.Provider>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { useStore, useToday } from './data/store';
import { Sidebar, TabBar } from './components/Navigation';
import { Editor } from './components/Editor';
import { markReleasesSeen, pendingReleases, WhatsNew } from './components/WhatsNew';
import { UpdateNotice } from './components/UpdateNotice';
import { HalloweenDecor, useSeasonTheme } from './components/Halloween';
import { useHalloween } from './lib/season';
import { HoyView } from './views/HoyView';
import { SemanaView } from './views/SemanaView';
import { CalendarView } from './views/CalendarView';
import { TableroView } from './views/TableroView';
import { ExamsView } from './views/ExamsView';
import { SubjectView } from './views/SubjectView';
import { SettingsView } from './views/SettingsView';
import { PrivacyView } from './views/PrivacyView';
import { UIContext, useMediaQuery, useRoute, type EditorRequest } from './ui';

export default function App() {
  const state = useStore();
  const today = useToday();
  // Semana de Halloween (26 oct – 1 nov): Nocta se disfraza; el 2 de noviembre vuelve a ser la de siempre
  const halloween = useHalloween(today) === 'on';
  useSeasonTheme(halloween);
  const route = useRoute();
  const desktop = useMediaQuery('(min-width: 900px)');
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [news, setNews] = useState(() => pendingReleases(state));

  const openEditor = useCallback((req: EditorRequest) => setEditor(req), []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const closeNews = useCallback(() => {
    markReleasesSeen();
    setNews([]);
  }, []);
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
    case 'privacidad':
      view = <PrivacyView desktop={desktop} />;
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
          {route.name !== 'ajustes' && route.name !== 'privacidad' && (
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
      <UpdateNotice />
      {halloween && <HalloweenDecor />}
      {news.length > 0 && !editor && (
        <WhatsNew title="Nocta se ha actualizado" releases={news} onClose={closeNews} />
      )}
    </UIContext.Provider>
  );
}

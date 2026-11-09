import type { Exam, State } from '../data/types';
import { ExamCard } from '../components/ExamCard';
import { StudiedButton, StudyStreak } from '../components/StudyStreak';
import { Empty, SectionHeader } from '../components/Common';
import { DesktopActions, PageHeader } from '../components/PageHeader';
import { colorCss, pastExams, subjectMap, upcomingExams } from '../lib/rules';

type Props = { state: State; today: string; desktop: boolean };

export function ExamsView({ state, today, desktop }: Props) {
  const subjects = subjectMap(state.subjects);
  const upcoming = upcomingExams(state.exams, today);
  const past = pastExams(state.exams, today);
  const n = upcoming.length;
  // Con grupos: tus exámenes por un lado y los de cada grupo por otro
  const mine = upcoming.filter((e) => !e.group);
  const grid = (list: Exam[], studied: boolean) => (
    <div className="exam-grid">
      {list.map((e, i) => (
        <div key={e.id} className="exam-item">
          <ExamCard exam={e} subject={subjects.get(e.subjectId)} today={today} hot={i === 0} />
          {studied && <StudiedButton exam={e} today={today} />}
        </div>
      ))}
    </div>
  );

  return (
    <main className={desktop ? 'main' : 'page'}>
      <PageHeader kicker={n === 0 ? 'Ninguno pendiente' : n === 1 ? '1 pendiente' : `${n} pendientes`} title="Exámenes">
        {desktop && <DesktopActions state={state} today={today} label="+ Nuevo examen" req={{ kind: 'exam' }} />}
      </PageHeader>

      {(mine.length > 0 || state.studyLog.length > 0) && (
        <section>
          <SectionHeader>Racha de estudio</SectionHeader>
          <StudyStreak studyLog={state.studyLog} today={today} />
        </section>
      )}

      {state.groups.length === 0 ? (
        <section>
          <SectionHeader>Próximos</SectionHeader>
          {upcoming.length ? grid(upcoming, true) : <Empty>Sin exámenes a la vista</Empty>}
        </section>
      ) : (
        <>
          <section className="exam-scope">
            <h2 className="exam-scope__head">
              <span className="exam-scope__icon" aria-hidden="true">👤</span>
              Tus exámenes
              <span className="exam-scope__sub">solo en tu calendario</span>
            </h2>
            {mine.length ? grid(mine, true) : <Empty>No tienes exámenes propios a la vista</Empty>}
          </section>
          {state.groups.map((g) => {
            const list = upcoming.filter((e) => e.group === g.id);
            return (
              <section key={g.id} className="exam-scope exam-scope--group" style={{ ['--g' as string]: colorCss(g.color) }}>
                <h2 className="exam-scope__head">
                  <span className="exam-scope__icon" aria-hidden="true">👥</span>
                  {g.name}
                  <span className="exam-scope__sub">del grupo</span>
                </h2>
                {list.length ? grid(list, false) : <Empty>Sin exámenes del grupo a la vista</Empty>}
              </section>
            );
          })}
        </>
      )}

      {past.length > 0 && (
        <section>
          <SectionHeader>Pasados</SectionHeader>
          <div className="exam-grid">
            {past.map((e) => (
              <ExamCard key={e.id} exam={e} subject={subjects.get(e.subjectId)} today={today} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

import type { State } from '../data/types';
import { ExamCard } from '../components/ExamCard';
import { Empty, SectionHeader } from '../components/Common';
import { DesktopActions, PageHeader } from '../components/PageHeader';
import { pastExams, subjectMap, upcomingExams } from '../lib/rules';

type Props = { state: State; today: string; desktop: boolean };

export function ExamsView({ state, today, desktop }: Props) {
  const subjects = subjectMap(state.subjects);
  const upcoming = upcomingExams(state.exams, today);
  const past = pastExams(state.exams, today);
  const n = upcoming.length;

  return (
    <main className={desktop ? 'main' : 'page'}>
      <PageHeader kicker={n === 0 ? 'Ninguno pendiente' : n === 1 ? '1 pendiente' : `${n} pendientes`} title="Exámenes">
        {desktop && <DesktopActions state={state} today={today} label="+ Nuevo examen" req={{ kind: 'exam' }} />}
      </PageHeader>

      <section>
        <SectionHeader>Próximos</SectionHeader>
        {upcoming.length ? (
          <div className="exam-grid">
            {upcoming.map((e, i) => (
              <ExamCard key={e.id} exam={e} subject={subjects.get(e.subjectId)} today={today} hot={i === 0} />
            ))}
          </div>
        ) : (
          <Empty>Sin exámenes a la vista</Empty>
        )}
      </section>

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

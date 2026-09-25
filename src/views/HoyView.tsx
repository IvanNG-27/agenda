import type { State, Task } from '../data/types';
import { ExamCard } from '../components/ExamCard';
import { TaskItem } from '../components/TaskItem';
import { Empty, List, SectionHeader, Welcome } from '../components/Common';
import { MiniCalendar } from '../components/MiniCalendar';
import { DesktopActions, PageHeader } from '../components/PageHeader';
import { longDate } from '../lib/dates';
import { groupForToday, subjectMap, upcomingExams } from '../lib/rules';

type Props = { state: State; today: string; desktop: boolean };

export function HoyView({ state, today, desktop }: Props) {
  const subjects = subjectMap(state.subjects);
  const g = groupForToday(state.tasks, today);
  const exams = upcomingExams(state.exams, today);
  const next = exams[0];
  const nothing = !g.late.length && !g.today.length && !g.tomorrow.length && !g.week.length && !g.later.length;

  const section = (title: string, tasks: Task[], opts: { count?: boolean; tone?: 'exam'; always?: boolean } = {}) =>
    (tasks.length > 0 || opts.always) && (
      <section>
        <SectionHeader count={opts.count ? tasks.length : undefined} tone={opts.tone}>
          {title}
        </SectionHeader>
        {tasks.length ? (
          <List>
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} subject={subjects.get(t.subjectId)} today={today} />
            ))}
          </List>
        ) : (
          <Empty>Nada por aquí</Empty>
        )}
      </section>
    );

  if (!desktop) {
    return (
      <main className="page">
        <PageHeader kicker={longDate(today)} title="Para mañana" />
        {next && (
          <ExamCard exam={next} subject={subjects.get(next.subjectId)} today={today} hot label="Próximo examen" inlineTitle />
        )}
        {section('Atrasado', g.late, { count: true, tone: 'exam' })}
        {section('Hoy', g.today, { count: true })}
        {section('Mañana', g.tomorrow, { count: true })}
        {section('Esta semana', g.week)}
        {section('Más adelante', g.later)}
        {state.subjects.length === 0 ? <Welcome /> : nothing && <Empty />}
      </main>
    );
  }

  return (
    <>
      <main className="main">
        <PageHeader kicker={longDate(today)} title="Hoy">
          <DesktopActions state={state} today={today} />
        </PageHeader>
        {state.subjects.length === 0 ? (
          <Welcome />
        ) : nothing ? (
          <Empty />
        ) : (
          <div className="columns">
            <div>
              {section('Atrasado', g.late, { count: true, tone: 'exam' })}
              {section('Para hoy', g.today, { count: true })}
              {section('Para mañana', g.tomorrow, { count: true, always: true })}
            </div>
            <div>
              {section('Esta semana', g.week, { count: true, always: true })}
              {section('Más adelante', g.later, { count: true })}
            </div>
          </div>
        )}
      </main>
      <aside className="panel">
        <SectionHeader>Exámenes</SectionHeader>
        {exams.length ? (
          <div className="stack">
            {exams.slice(0, 2).map((e, i) => {
              const s = subjects.get(e.subjectId);
              return <ExamCard key={e.id} exam={e} subject={s} today={today} hot={i === 0} label={s?.name ?? 'Examen'} chip={false} />;
            })}
          </div>
        ) : (
          <Empty>Sin exámenes a la vista</Empty>
        )}
        <MiniCalendar today={today} exams={state.exams} />
      </aside>
    </>
  );
}

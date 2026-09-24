import type { State } from '../data/types';
import { ExamCard } from '../components/ExamCard';
import { TaskItem } from '../components/TaskItem';
import { Empty, List, SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { DesktopActions, PageHeader } from '../components/PageHeader';
import { byDue, colorVar, pastExams, upcomingExams } from '../lib/rules';
import { href } from '../ui';

type Props = { state: State; today: string; desktop: boolean; id: string };

/** Lista de deberes y exámenes de una asignatura. */
export function SubjectView({ state, today, desktop, id }: Props) {
  const subject = state.subjects.find((s) => s.id === id);
  if (!subject) {
    return (
      <main className={desktop ? 'main' : 'page'}>
        <Empty>Esta asignatura no existe</Empty>
      </main>
    );
  }

  const tasks = state.tasks.filter((t) => t.subjectId === id);
  const pending = tasks.filter((t) => !t.done).sort(byDue);
  const done = tasks.filter((t) => t.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const own = state.exams.filter((e) => e.subjectId === id);
  const exams = [...upcomingExams(own, today), ...pastExams(own, today)];
  const nextId = upcomingExams(state.exams, today)[0]?.id;

  return (
    <main className={desktop ? 'main' : 'page'}>
      {!desktop && (
        <a className="back" href={href({ name: 'tablero' })}>
          <Icon name="izq" size={16} />
          Tablero
        </a>
      )}
      <PageHeader
        kicker={
          <span className="kicker__row">
            <span className="dot dot--10" style={{ background: colorVar(subject) }} />
            {subject.short}
          </span>
        }
        title={subject.name}
      >
        {desktop && <DesktopActions state={state} today={today} req={{ kind: 'task', subjectId: id }} />}
      </PageHeader>

      <section>
        <SectionHeader count={pending.length}>Pendientes</SectionHeader>
        {pending.length ? (
          <List>
            {pending.map((t) => (
              <TaskItem key={t.id} task={t} subject={subject} today={today} />
            ))}
          </List>
        ) : (
          <Empty>Todo hecho</Empty>
        )}
      </section>

      {exams.length > 0 && (
        <section>
          <SectionHeader>Exámenes</SectionHeader>
          <div className="exam-grid">
            {exams.map((e) => (
              <ExamCard key={e.id} exam={e} subject={subject} today={today} hot={e.id === nextId} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <SectionHeader count={done.length}>Hechas</SectionHeader>
          <List>
            {done.map((t) => (
              <TaskItem key={t.id} task={t} subject={subject} today={today} />
            ))}
          </List>
        </section>
      )}
    </main>
  );
}

import { useState, type DragEvent } from 'react';
import type { State, Task } from '../data/types';
import { actions } from '../data/store';
import { ExamCard } from '../components/ExamCard';
import { TaskItem } from '../components/TaskItem';
import { SubjectChip } from '../components/SubjectChip';
import { Empty, SectionHeader, Welcome } from '../components/Common';
import { PageHeader } from '../components/PageHeader';
import { addDays, day, DOW_SHORT, isoWeek, weekday } from '../lib/dates';
import { byDue, colorVar, subjectMap, upcomingExams } from '../lib/rules';
import { href, useUI } from '../ui';

type Props = { state: State; today: string; desktop: boolean };

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'TÚ';
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

type Column = 'todo' | 'tomorrow' | 'done';

export function TableroView({ state, today, desktop }: Props) {
  const subjects = subjectMap(state.subjects);
  const tomorrow = addDays(today, 1);
  const exams = upcomingExams(state.exams, today);

  if (!desktop) {
    const summary = (subjectId: string) => {
      const pending = state.tasks.filter((t) => t.subjectId === subjectId && !t.done).sort(byDue);
      const late = pending.filter((t) => t.dueDate < today).length;
      const forToday = pending.filter((t) => t.dueDate === today).length;
      const forTomorrow = pending.filter((t) => t.dueDate === tomorrow).length;
      let sub = 'Todo hecho';
      if (late) sub = `${late} ${late === 1 ? 'atrasada' : 'atrasadas'}`;
      else if (forToday) sub = `${forToday} para hoy`;
      else if (forTomorrow) sub = `${forTomorrow} para mañana`;
      else if (pending[0]) sub = `${DOW_SHORT[weekday(pending[0].dueDate)].toLowerCase()} ${day(pending[0].dueDate)}`;
      return { count: pending.length, sub };
    };

    return (
      <main className="page">
        <PageHeader kicker={state.userName.trim() ? `Hola, ${state.userName.trim()}` : 'Hola'} title="Tablero">
          <a className="avatar" href={href({ name: 'ajustes' })} aria-label="Ajustes">
            {initials(state.userName)}
          </a>
        </PageHeader>

        <section>
          <SectionHeader>Exámenes</SectionHeader>
          {exams.length ? (
            <div className="carousel">
              {exams.map((e, i) => {
                const s = subjects.get(e.subjectId);
                return (
                  <ExamCard
                    key={e.id}
                    exam={e}
                    subject={s}
                    today={today}
                    hot={i === 0}
                    compact
                    label={s?.short ?? 'Examen'}
                    chip={false}
                    showDate={false}
                    bar={false}
                  />
                );
              })}
            </div>
          ) : (
            <Empty>Sin exámenes a la vista</Empty>
          )}
        </section>

        <section>
          <SectionHeader>Deberes por asignatura</SectionHeader>
          {state.subjects.length === 0 && <Welcome />}
          <div className="tiles">
            {state.subjects.map((s) => {
              const { count, sub } = summary(s.id);
              return (
                <a key={s.id} className="tile" href={href({ name: 'asignatura', id: s.id })} style={{ borderTopColor: colorVar(s) }}>
                  <span className="tile__count">{count}</span>
                  <span className="tile__name">{s.short}</span>
                  <span className="tile__sub">{sub}</span>
                </a>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return <Kanban state={state} today={today} />;
}

/** Escritorio C · Tablero kanban */
function Kanban({ state, today }: { state: State; today: string }) {
  const { openEditor } = useUI();
  const subjects = subjectMap(state.subjects);
  const tomorrow = addDays(today, 1);
  const [filter, setFilter] = useState<string | null>(null);
  const [over, setOver] = useState<Column | null>(null);

  const visible = state.tasks.filter((t) => !filter || t.subjectId === filter);
  const cols: Record<Column, Task[]> = {
    todo: visible.filter((t) => !t.done && t.dueDate !== tomorrow).sort(byDue),
    tomorrow: visible.filter((t) => !t.done && t.dueDate === tomorrow).sort(byDue),
    done: visible.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
  };
  const exams = upcomingExams(state.exams, today).filter((e) => !filter || e.subjectId === filter).slice(0, 3);

  const drop = (col: Column) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    if (col === 'done') {
      if (!t.done) actions.setDone(id, true);
    } else if (col === 'tomorrow') {
      actions.updateTask(id, { dueDate: tomorrow, done: false, doneAt: undefined });
    } else if (t.done) {
      actions.setDone(id, false);
    }
  };

  const column = (col: Column, title: string) => (
    <section
      className={`kcol${over === col ? ' is-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (over !== col) setOver(col);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
      onDrop={drop(col)}
      aria-label={title}
    >
      <h2 className="kcol__head">
        {title}
        <span className="kcol__count">{cols[col].length}</span>
      </h2>
      <div className="list">
        {cols[col].map((t) => (
          <TaskItem key={t.id} task={t} subject={subjects.get(t.subjectId)} today={today} raised draggable />
        ))}
      </div>
      {col === 'todo' && (
        <button type="button" className="add-dashed" onClick={() => openEditor({ kind: 'task', subjectId: filter ?? undefined })}>
          + Añadir tarea
        </button>
      )}
    </section>
  );

  return (
    <main className="main main--fill">
      <PageHeader kicker={`Semana ${isoWeek(today)}`} title="Tablero">
        <div className="chips" role="group" aria-label="Filtrar por asignatura">
          <SubjectChip label="Todas" solid={filter === null} onClick={() => setFilter(null)} />
          {state.subjects.map((s) => (
            <SubjectChip key={s.id} subject={s} solid={filter === s.id} onClick={() => setFilter(filter === s.id ? null : s.id)} />
          ))}
        </div>
        <button type="button" className="btn" onClick={() => openEditor({ kind: 'task', subjectId: filter ?? undefined })}>
          + Nueva
        </button>
      </PageHeader>

      {exams.length > 0 && (
        <div className="exam-strip">
          {exams.map((e, i) => {
            const s = subjects.get(e.subjectId);
            return (
              <ExamCard
                key={e.id}
                exam={e}
                subject={s}
                today={today}
                hot={i === 0}
                compact
                horizontal
                label={`Examen · ${s?.name ?? ''}`}
                chip={false}
              />
            );
          })}
        </div>
      )}

      <div className="kanban">
        {column('todo', 'Por hacer')}
        {column('tomorrow', 'Para mañana')}
        {column('done', 'Hecho')}
      </div>
    </main>
  );
}

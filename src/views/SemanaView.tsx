import { useState } from 'react';
import type { State } from '../data/types';
import { ExamLine } from '../components/ExamCard';
import { TaskItem } from '../components/TaskItem';
import { Empty, SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { addDays, day, DOW_LONG, DOW_SHORT, isoWeek, monthName, startOfWeek, weekday } from '../lib/dates';
import { byDate, byDue, colorVar, subjectMap, upcomingExams } from '../lib/rules';

type Props = { state: State; today: string };

/** Móvil C · Semana: tira L–V y línea de tiempo del día seleccionado. */
export function SemanaView({ state, today }: Props) {
  const subjects = subjectMap(state.subjects);
  // En fin de semana se enseña ya la semana siguiente
  const initial = weekday(today) >= 5 ? addDays(startOfWeek(today), 7) : today;
  const [selected, setSelected] = useState(initial);
  const monday = startOfWeek(selected);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));

  const tasksOn = (d: string) => state.tasks.filter((t) => t.dueDate === d).sort(byDue);
  const examsOn = (d: string) => state.exams.filter((e) => e.date === d).sort(byDate);

  const dayTasks = tasksOn(selected);
  const dayExams = examsOn(selected);
  const next = upcomingExams(state.exams, today).find((e) => e.date !== selected);
  const tomorrow = addDays(today, 1);

  const shiftWeek = (n: number) => setSelected(addDays(monday, n * 7));

  return (
    <main className="page">
      <PageHeader
        kicker={
          <span className="kicker__row">
            Semana {isoWeek(monday)} · {monthName(monday)}
            <span className="kicker__nav">
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => shiftWeek(-1)} aria-label="Semana anterior">
                <Icon name="izq" size={16} />
              </button>
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => shiftWeek(1)} aria-label="Semana siguiente">
                <Icon name="der" size={16} />
              </button>
            </span>
          </span>
        }
        title="Semana"
      />

      <div className="strip" role="tablist" aria-label="Días de la semana">
        {days.map((d) => {
          const colors = [...new Set([...examsOn(d), ...tasksOn(d)].map((x) => x.subjectId))].slice(0, 3);
          const isSel = d === selected;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isSel}
              className={`strip__day${isSel ? ' is-selected' : ''}${d === today ? ' is-today' : ''}`}
              onClick={() => setSelected(d)}
            >
              <span className="strip__dow">{DOW_SHORT[weekday(d)]}</span>
              <span className="strip__num">{day(d)}</span>
              <span className="strip__dots">
                {colors.map((id) => (
                  <span key={id} className="dot dot--6" style={isSel ? undefined : { background: colorVar(subjects.get(id)) }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section>
        <SectionHeader>
          {DOW_LONG[weekday(selected)]} {day(selected)}
        </SectionHeader>
        {dayTasks.length || dayExams.length ? (
          <div className="timeline">
            {dayExams.map((e) => (
              <div key={e.id} className="timeline__row">
                <span className="node node--exam" />
                <ExamLine exam={e} subject={subjects.get(e.subjectId)} today={today} />
              </div>
            ))}
            {dayTasks.map((t) => {
              const s = subjects.get(t.subjectId);
              return (
                <div key={t.id} className="timeline__row">
                  <span className="node" style={{ borderColor: colorVar(s) }} />
                  <TaskItem task={t} subject={s} today={today} extra={t.dueDate === tomorrow ? 'para mañana' : undefined} />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty>Nada para este día</Empty>
        )}
      </section>

      {next && (
        <section>
          <SectionHeader>Próximo examen</SectionHeader>
          <div className="timeline timeline--single">
            <div className="timeline__row">
              <span className="node node--exam" />
              <ExamLine exam={next} subject={subjects.get(next.subjectId)} today={today} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

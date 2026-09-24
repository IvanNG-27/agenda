import { useState } from 'react';
import type { State } from '../data/types';
import { ExamCard } from '../components/ExamCard';
import { TaskItem } from '../components/TaskItem';
import { Empty, List, SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import {
  addDays, addMonths, cap, day, dayMonth, DOW_LONG, DOW_SHORT, endOfWeek, monthName, startOfMonth, startOfWeek, weekday, year,
} from '../lib/dates';
import { byDate, byDue, colorVar, subjectMap, upcomingExams } from '../lib/rules';
import { useUI } from '../ui';

type Props = { state: State; today: string; initialDate?: string; initialMode: 'mes' | 'semana' };

const MAX_EVENTS = 3;

/** Escritorio B · Calendario mensual (con modo semana). */
export function CalendarView({ state, today, initialDate, initialMode }: Props) {
  const { openEditor } = useUI();
  const subjects = subjectMap(state.subjects);
  const [selected, setSelected] = useState(initialDate ?? today);
  const [month, setMonth] = useState(startOfMonth(initialDate ?? today));
  const [mode, setMode] = useState(initialMode);

  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7);
  let cells: string[];
  if (mode === 'mes') {
    const last = endOfWeek(addDays(addMonths(month, 1), -1));
    cells = [];
    for (let d = startOfWeek(month); d <= last; d = addDays(d, 1)) cells.push(d);
  } else {
    const mon = startOfWeek(selected);
    cells = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mon, i));
  }

  const move = (n: number) => {
    if (mode === 'mes') {
      const m = addMonths(month, n);
      setMonth(m);
      setSelected(m.slice(0, 7) === today.slice(0, 7) ? today : m);
    } else {
      const d = addDays(selected, n * 7);
      setSelected(d);
      setMonth(startOfMonth(d));
    }
  };

  const select = (d: string) => {
    setSelected(d);
    if (mode === 'semana') setMonth(startOfMonth(d));
  };

  const shown = mode === 'mes' ? month : selected;
  const tasksOn = (d: string) => state.tasks.filter((t) => t.dueDate === d).sort(byDue);
  const examsOn = (d: string) => state.exams.filter((e) => e.date === d).sort(byDate);

  const selTasks = tasksOn(selected);
  const selExams = examsOn(selected);
  const nextDay = addDays(selected, 1);
  const nextTasks = tasksOn(nextDay).filter((t) => !t.done);
  const next = upcomingExams(state.exams, today)[0];
  const isToday = selected === today;

  return (
    <>
      <main className="main main--fill">
        <PageHeader kicker={year(shown)} title={cap(monthName(shown))}>
          <div className="segmented segmented--sm" role="radiogroup" aria-label="Vista">
            {(['semana', 'mes'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                className={`segmented__opt${mode === m ? ' is-active' : ''}`}
                onClick={() => {
                  setMode(m);
                  setMonth(startOfMonth(selected));
                }}
              >
                {m === 'mes' ? 'Mes' : 'Semana'}
              </button>
            ))}
          </div>
          <div className="pager">
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => move(-1)} aria-label={mode === 'mes' ? 'Mes anterior' : 'Semana anterior'}>
              <Icon name="izq" size={16} />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => move(1)} aria-label={mode === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}>
              <Icon name="der" size={16} />
            </button>
          </div>
          <button type="button" className="btn" onClick={() => openEditor({ kind: 'task', date: selected })}>
            + Añadir
          </button>
        </PageHeader>

        <div className={`cal${mode === 'semana' ? ' cal--week' : ''}`} style={{ ['--rows' as string]: cells.length / 7 }}>
          {DOW_SHORT.map((d) => (
            <span key={d} className="cal__dow">{d}</span>
          ))}
          {cells.map((d) => {
            const exams = examsOn(d);
            const tasks = tasksOn(d);
            const events = [
              ...exams.map((e) => ({ kind: 'exam' as const, id: e.id, title: e.title, subjectId: e.subjectId, done: false })),
              ...tasks.map((t) => ({ kind: 'task' as const, id: t.id, title: t.title, subjectId: t.subjectId, done: t.done })),
            ];
            const limit = mode === 'mes' ? MAX_EVENTS : events.length;
            const cls = [
              'cal__cell',
              mode === 'mes' && !inMonth(d) && 'is-other',
              d === today && 'is-today',
              d === selected && 'is-selected',
            ].filter(Boolean).join(' ');
            return (
              <div key={d} className={cls} onClick={() => select(d)} onDoubleClick={() => openEditor({ kind: 'task', date: d })}>
                <button
                  type="button"
                  className="cal__num"
                  onClick={(e) => {
                    e.stopPropagation();
                    select(d);
                  }}
                  aria-label={`${DOW_LONG[weekday(d)]} ${day(d)} de ${monthName(d)}`}
                  aria-pressed={d === selected}
                >
                  {day(d)}
                </button>
                {events.slice(0, limit).map((ev) => {
                  const s = subjects.get(ev.subjectId);
                  return (
                    <button
                      key={ev.kind + ev.id}
                      type="button"
                      className={`event${ev.kind === 'exam' ? ' event--exam' : ''}${ev.done ? ' is-done' : ''}`}
                      style={ev.kind === 'exam' ? undefined : { borderLeftColor: colorVar(s) }}
                      title={`${ev.kind === 'exam' ? 'Examen · ' : ''}${s?.name ?? ''} · ${ev.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor({ kind: ev.kind, id: ev.id });
                      }}
                    >
                      {ev.kind === 'exam' ? `${s?.short ?? 'Examen'} · ${ev.title}` : ev.title}
                    </button>
                  );
                })}
                {events.length > limit && <span className="event__more">+{events.length - limit} más</span>}
              </div>
            );
          })}
        </div>
      </main>

      <aside className="panel">
        <p className="kicker">{DOW_LONG[weekday(selected)]}</p>
        <p className="display">{dayMonth(selected)}</p>

        {selExams.length > 0 && (
          <section>
            <SectionHeader tone="exam">{isToday ? 'Exámenes de hoy' : 'Exámenes del día'}</SectionHeader>
            <div className="stack">
              {selExams.map((e) => (
                <ExamCard key={e.id} exam={e} subject={subjects.get(e.subjectId)} today={today} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader>{isToday ? 'Entregas de hoy' : 'Entregas del día'}</SectionHeader>
          {selTasks.length ? (
            <List>
              {selTasks.map((t) => (
                <TaskItem key={t.id} task={t} subject={subjects.get(t.subjectId)} today={today} />
              ))}
            </List>
          ) : (
            <Empty>Sin entregas</Empty>
          )}
        </section>

        <section>
          <SectionHeader>{isToday ? 'Para mañana' : 'Día siguiente'}</SectionHeader>
          {nextTasks.length ? (
            <List>
              {nextTasks.map((t) => (
                <TaskItem key={t.id} task={t} subject={subjects.get(t.subjectId)} today={today} />
              ))}
            </List>
          ) : (
            <Empty>Sin entregas</Empty>
          )}
        </section>

        {next && (
          <section>
            <SectionHeader>Próximo examen</SectionHeader>
            <ExamCard
              exam={next}
              subject={subjects.get(next.subjectId)}
              today={today}
              hot
              label={subjects.get(next.subjectId)?.name ?? 'Examen'}
              chip={false}
              inlineTitle
              showDate={false}
              bar={false}
            />
          </section>
        )}
      </aside>
    </>
  );
}

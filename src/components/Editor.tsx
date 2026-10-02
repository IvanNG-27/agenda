import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EventKind, State } from '../data/types';
import { actions } from '../data/store';
import { addDays } from '../lib/dates';
import { EVENT_KINDS, kindInfo } from '../lib/events';
import { useModal, type EditorRequest } from '../ui';
import { SubjectChip } from './SubjectChip';
import { Icon } from './Icons';

type Props = {
  req: EditorRequest;
  state: State;
  today: string;
  desktop: boolean;
  onClose: () => void;
};

const KIND_LABEL = { task: 'Tarea', exam: 'Examen', event: 'Evento' } as const;
const HEADING = {
  task: ['Nueva tarea', 'Editar tarea'],
  exam: ['Nuevo examen', 'Editar examen'],
  event: ['Nuevo evento', 'Editar evento'],
} as const;

/** Añadir / editar tarea, examen o evento. Hoja inferior en móvil, diálogo en escritorio. */
export function Editor({ req, state, today, desktop, onClose }: Props) {
  const task = req.kind === 'task' && req.id ? state.tasks.find((t) => t.id === req.id) : undefined;
  const exam = req.kind === 'exam' && req.id ? state.exams.find((e) => e.id === req.id) : undefined;
  const event = req.kind === 'event' && req.id ? state.events.find((e) => e.id === req.id) : undefined;
  const editing = !!(task || exam || event);

  // Sin asignaturas no se pueden apuntar tareas ni exámenes: se empieza por un evento
  const [kind, setKind] = useState(!editing && !state.subjects.length ? 'event' : req.kind);
  const [title, setTitle] = useState(task?.title ?? exam?.title ?? event?.title ?? '');
  const [subjectId, setSubjectId] = useState(
    task?.subjectId ?? exam?.subjectId ?? req.subjectId ?? state.subjects[0]?.id ?? '',
  );
  const [date, setDate] = useState(task?.dueDate ?? exam?.date ?? event?.date ?? req.date ?? addDays(today, 1));
  const [notes, setNotes] = useState(task?.notes ?? event?.notes ?? '');
  const [time, setTime] = useState(exam?.time ?? '');
  const [prep, setPrep] = useState(exam?.prep ?? 0);
  const [eventKind, setEventKind] = useState<EventKind>(event?.kind ?? 'cumple');
  const [eventTime, setEventTime] = useState(event?.time ?? '');
  const [place, setPlace] = useState(event?.place ?? '');
  const [yearly, setYearly] = useState(event ? !!event.yearly : true);
  const [yearlyTouched, setYearlyTouched] = useState(!!event);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModal(dialogRef, onClose);
  useEffect(() => {
    if (!editing) titleRef.current?.focus();
  }, [editing]);

  const pickEventKind = (k: EventKind) => {
    setEventKind(k);
    // Los cumpleaños se repiten cada año; el resto, no (salvo que se haya cambiado a mano)
    if (!yearlyTouched) setYearly(k === 'cumple');
  };

  const valid =
    title.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date) && (kind === 'event' || subjectId !== '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const t = title.trim();
    if (kind === 'task') {
      const data = { title: t, subjectId, dueDate: date, notes: notes.trim() || undefined };
      if (task) actions.updateTask(task.id, data);
      else actions.addTask(data);
    } else if (kind === 'exam') {
      const data = { title: t, subjectId, date, time: time.trim() || undefined, prep };
      if (exam) actions.updateExam(exam.id, data);
      else actions.addExam(data);
    } else {
      const data = {
        title: t,
        kind: eventKind,
        date,
        time: eventTime || undefined,
        place: place.trim() || undefined,
        notes: notes.trim() || undefined,
        yearly: yearly || undefined,
      };
      if (event) actions.updateEvent(event.id, data);
      else actions.addEvent(data);
    }
    onClose();
  };

  const remove = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (task) actions.deleteTask(task.id);
    if (exam) actions.deleteExam(exam.id);
    if (event) actions.deleteEvent(event.id);
    onClose();
  };

  const placeholder =
    kind === 'task' ? 'Ejercicios 4–12, pág. 58' : kind === 'exam' ? 'Tema 1–2' : kindInfo(eventKind).example;

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={desktop ? 'dialog' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <form onSubmit={submit} className="form">
          <div className="form__head">
            <h2 id="editor-title" className="form__title">{HEADING[kind][editing ? 1 : 0]}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="cerrar" size={18} />
            </button>
          </div>

          {!editing && (
            <div className="segmented" role="radiogroup" aria-label="Tipo">
              {(['task', 'exam', 'event'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className={`segmented__opt${kind === k ? ' is-active' : ''}`}
                  onClick={() => setKind(k)}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          )}

          {kind === 'event' && (
            <fieldset className="field">
              <legend className="field__label">Tipo de evento</legend>
              <div className="chips" role="radiogroup" aria-label="Tipo de evento">
                {EVENT_KINDS.map((k) => {
                  const on = k.kind === eventKind;
                  return (
                    <button
                      key={k.kind}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`chip${on ? ' chip--solid' : ''}`}
                      style={on ? { background: `var(--${k.color})` } : undefined}
                      onClick={() => pickEventKind(k.kind)}
                    >
                      <span aria-hidden="true">{k.emoji}</span>
                      <span className="chip__text">{k.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <label className="field">
            <span className="field__label">Título</span>
            <input
              ref={titleRef}
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholder}
              maxLength={120}
            />
          </label>

          {kind !== 'event' && (
            <fieldset className="field">
              <legend className="field__label">Asignatura</legend>
              {state.subjects.length ? (
                <div className="chips">
                  {state.subjects.map((s) => (
                    <SubjectChip key={s.id} subject={s} solid={s.id === subjectId} onClick={() => setSubjectId(s.id)} />
                  ))}
                </div>
              ) : (
                <p className="backup__text">
                  Aún no tienes asignaturas.{' '}
                  <a className="inline-link" href="#/ajustes" onClick={onClose}>
                    Añádelas en Ajustes
                  </a>{' '}
                  y vuelve para apuntar esto.
                </p>
              )}
            </fieldset>
          )}

          <div className="form__row">
            <label className="field">
              <span className="field__label">{kind === 'task' ? 'Entrega' : 'Fecha'}</span>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            {kind === 'exam' && (
              <label className="field">
                <span className="field__label">Hora</span>
                <input className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="1ª hora" maxLength={30} />
              </label>
            )}
            {kind === 'event' && (
              <label className="field">
                <span className="field__label">Hora · opcional</span>
                <input className="input" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
              </label>
            )}
          </div>

          {kind === 'event' && (
            <>
              <label className="field">
                <span className="field__label">Lugar · opcional</span>
                <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Dónde" maxLength={120} />
              </label>
              <label className="check-row">
                <button
                  type="button"
                  className="checkbox"
                  role="checkbox"
                  aria-checked={yearly}
                  onClick={() => {
                    setYearly(!yearly);
                    setYearlyTouched(true);
                  }}
                >
                  {yearly && <Icon name="check" size={16} />}
                </button>
                <span>Se repite cada año</span>
              </label>
            </>
          )}

          {kind === 'exam' ? (
            <label className="field">
              <span className="field__label">Repaso · {prep}%</span>
              <input
                className="range"
                type="range"
                min={0}
                max={100}
                step={5}
                value={prep}
                onChange={(e) => setPrep(Number(e.target.value))}
                style={{ ['--pct' as string]: `${prep}%` }}
              />
            </label>
          ) : (
            <label className="field">
              <span className="field__label">Notas</span>
              <textarea
                className="input textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={kind === 'event' ? 'Llevar el regalo' : 'Tema 2'}
                rows={2}
              />
            </label>
          )}

          <div className="form__actions">
            {editing && (
              <button type="button" className={`btn btn--secondary${confirmDelete ? ' btn--danger' : ''}`} onClick={remove}>
                {confirmDelete ? 'Toca otra vez para borrar' : 'Borrar'}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={!valid}>
              {editing ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

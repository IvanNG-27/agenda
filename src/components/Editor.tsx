import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EventKind, State } from '../data/types';
import { actions, canEdit, editableGroups, groupOf } from '../data/store';
import { colorCss } from '../lib/rules';
import { addDays } from '../lib/dates';
import { EVENT_KINDS, kindInfo } from '../lib/events';
import { cleanReminders, MAX_REMINDERS, optionsFor } from '../lib/reminders';
import { useNotify } from '../notify';
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
  const existing = task ?? exam ?? event;
  const editing = !!existing;
  // Lectores de un grupo: lo ven todo pero no pueden cambiar nada
  const readOnly = editing && !canEdit(existing, state);
  const targets = editableGroups(state);

  // Dónde se apunta: '' = solo yo; si no, el id del grupo. Lo ya creado se queda donde está.
  const reqSubject = state.subjects.find((s) => s.id === req.subjectId);
  const [where, setWhere] = useState(
    existing?.group ?? (reqSubject?.group && canEdit(reqSubject, state) ? reqSubject.group : ''),
  );
  const subjects = state.subjects.filter((s) => (s.group ?? '') === where);
  const group = groupOf(state, where);

  // Sin asignaturas no se pueden apuntar tareas ni exámenes: se empieza por un evento
  const [kind, setKind] = useState(!editing && !subjects.length ? 'event' : req.kind);
  const [title, setTitle] = useState(task?.title ?? exam?.title ?? event?.title ?? '');
  const [subjectId, setSubjectId] = useState(
    task?.subjectId ?? exam?.subjectId ?? (subjects.some((s) => s.id === req.subjectId) ? req.subjectId : subjects[0]?.id) ?? '',
  );
  const pickWhere = (w: string) => {
    setWhere(w);
    setSubjectId(state.subjects.find((s) => (s.group ?? '') === w)?.id ?? '');
  };
  const [date, setDate] = useState(task?.dueDate ?? exam?.date ?? event?.date ?? req.date ?? addDays(today, 1));
  const [notes, setNotes] = useState(task?.notes ?? event?.notes ?? '');
  const [time, setTime] = useState(exam?.time ?? '');
  const [prep, setPrep] = useState(exam?.prep ?? 0);
  const [eventKind, setEventKind] = useState<EventKind>(event?.kind ?? 'cumple');
  const [eventTime, setEventTime] = useState(event?.time ?? '');
  const [place, setPlace] = useState(event?.place ?? '');
  const [yearly, setYearly] = useState(event ? !!event.yearly : true);
  const [yearlyTouched, setYearlyTouched] = useState(!!event);
  const [reminders, setReminders] = useState<number[]>(task?.reminders ?? exam?.reminders ?? event?.reminders ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notify = useNotify();
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
    !readOnly && title.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date) && (kind === 'event' || subjects.some((s) => s.id === subjectId));

  // Con hora (eventos con hora) los avisos son "X antes"; si es de todo el día, a una hora fija de ese día o de antes
  const timed = kind === 'event' && eventTime !== '';
  const reminderOptions = optionsFor(timed);
  const chosen = cleanReminders(reminders, timed) ?? [];
  const toggleReminder = (m: number) =>
    setReminders(chosen.includes(m) ? chosen.filter((x) => x !== m) : chosen.length < MAX_REMINDERS ? [...chosen, m] : chosen);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const t = title.trim();
    const g = where || undefined;
    if (kind === 'task') {
      const data = { title: t, subjectId, dueDate: date, notes: notes.trim() || undefined, reminders: cleanReminders(chosen, false) };
      if (task) actions.updateTask(task.id, data);
      else actions.addTask({ ...data, group: g });
    } else if (kind === 'exam') {
      const data = { title: t, subjectId, date, time: time.trim() || undefined, prep, reminders: cleanReminders(chosen, false) };
      if (exam) actions.updateExam(exam.id, data);
      else actions.addExam({ ...data, group: g });
    } else {
      const data = {
        title: t,
        kind: eventKind,
        date,
        time: eventTime || undefined,
        place: place.trim() || undefined,
        notes: notes.trim() || undefined,
        yearly: yearly || undefined,
        reminders: cleanReminders(chosen, timed),
      };
      if (event) actions.updateEvent(event.id, data);
      else actions.addEvent({ ...data, group: g });
    }
    onClose();
  };

  const remove = () => {
    if (readOnly) return;
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
            <h2 id="editor-title" className="form__title">{readOnly ? KIND_LABEL[kind] : HEADING[kind][editing ? 1 : 0]}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="cerrar" size={18} />
            </button>
          </div>

          {readOnly && (
            <p className="readonly-note" role="note">
              Solo lectura: es del grupo «{group?.name}» y quien lo administra no te ha dado permiso para editar.
            </p>
          )}

          {!editing && targets.length > 0 && (
            <fieldset className="field">
              <legend className="field__label">¿Dónde?</legend>
              <div className="chips" role="radiogroup" aria-label="Dónde se apunta">
                {[{ id: '', name: 'Solo yo', color: 'accent' }, ...targets].map((g) => {
                  const on = g.id === where;
                  return (
                    <button
                      key={g.id || 'yo'}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`chip${on ? ' chip--solid' : ''}`}
                      style={on ? { background: colorCss(g.color) } : undefined}
                      onClick={() => pickWhere(g.id)}
                    >
                      <span className="chip__text">{g.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          {editing && group && !readOnly && <p className="group-tag">En el grupo «{group.name}»</p>}

          <fieldset className="form__fields" disabled={readOnly}>
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
              {subjects.length ? (
                <div className="chips">
                  {subjects.map((s) => (
                    <SubjectChip key={s.id} subject={s} solid={s.id === subjectId} onClick={() => setSubjectId(s.id)} />
                  ))}
                </div>
              ) : (
                <p className="backup__text">
                  {group ? 'Este grupo aún no tiene asignaturas.' : 'Aún no tienes asignaturas.'}{' '}
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
                maxLength={2000}
                rows={2}
              />
            </label>
          )}

          <fieldset className="field">
            <legend className="field__label">Recordatorio{chosen.length ? ` · ${chosen.length}` : ''}</legend>
            <div className="chips" role="group" aria-label="Recordatorio">
              {reminderOptions.map((o) => {
                const on = chosen.includes(o.minutes);
                return (
                  <button
                    key={o.minutes}
                    type="button"
                    className={`chip${on ? ' chip--solid' : ''}`}
                    style={on ? { background: 'var(--accent)' } : undefined}
                    aria-pressed={on}
                    disabled={!on && chosen.length >= MAX_REMINDERS}
                    onClick={() => toggleReminder(o.minutes)}
                  >
                    <span className="chip__text">{o.label}</span>
                  </button>
                );
              })}
            </div>
            {chosen.length > 0 && notify.state !== 'push' && notify.state !== 'local' && (
              <p className="field__hint">
                {notify.state === 'blocked'
                  ? 'Las notificaciones están bloqueadas en este navegador: actívalas en la configuración del sitio.'
                  : notify.state === 'unsupported'
                    ? 'Este navegador no puede mostrar notificaciones.'
                    : 'Para recibirlo, activa las notificaciones en Ajustes.'}
              </p>
            )}
          </fieldset>
          </fieldset>

          <div className="form__actions">
            {editing && !readOnly && (
              <button type="button" className={`btn btn--secondary${confirmDelete ? ' btn--danger' : ''}`} onClick={remove}>
                {confirmDelete ? 'Toca otra vez para borrar' : 'Borrar'}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!readOnly && (
              <button type="submit" className="btn" disabled={!valid}>
                {editing ? 'Guardar' : 'Añadir'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

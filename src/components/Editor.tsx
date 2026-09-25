import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { State } from '../data/types';
import { actions } from '../data/store';
import { addDays } from '../lib/dates';
import type { EditorRequest } from '../ui';
import { SubjectChip } from './SubjectChip';
import { Icon } from './Icons';

type Props = {
  req: EditorRequest;
  state: State;
  today: string;
  desktop: boolean;
  onClose: () => void;
};

/** Añadir / editar tarea o examen. Hoja inferior en móvil, diálogo en escritorio. */
export function Editor({ req, state, today, desktop, onClose }: Props) {
  const task = req.kind === 'task' && req.id ? state.tasks.find((t) => t.id === req.id) : undefined;
  const exam = req.kind === 'exam' && req.id ? state.exams.find((e) => e.id === req.id) : undefined;
  const editing = !!(task || exam);

  const [kind, setKind] = useState(req.kind);
  const [title, setTitle] = useState(task?.title ?? exam?.title ?? '');
  const [subjectId, setSubjectId] = useState(
    task?.subjectId ?? exam?.subjectId ?? req.subjectId ?? state.subjects[0]?.id ?? '',
  );
  const [date, setDate] = useState(task?.dueDate ?? exam?.date ?? req.date ?? addDays(today, 1));
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [time, setTime] = useState(exam?.time ?? '');
  const [prep, setPrep] = useState(exam?.prep ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    if (!editing) titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea, [tabindex]');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [editing, onClose]);

  const valid = title.trim() !== '' && subjectId !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const t = title.trim();
    if (kind === 'task') {
      const data = { title: t, subjectId, dueDate: date, notes: notes.trim() || undefined };
      if (task) actions.updateTask(task.id, data);
      else actions.addTask(data);
    } else {
      const data = { title: t, subjectId, date, time: time.trim() || undefined, prep };
      if (exam) actions.updateExam(exam.id, data);
      else actions.addExam(data);
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
    onClose();
  };

  const heading = editing
    ? kind === 'task' ? 'Editar tarea' : 'Editar examen'
    : kind === 'task' ? 'Nueva tarea' : 'Nuevo examen';

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
            <h2 id="editor-title" className="form__title">{heading}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="cerrar" size={18} />
            </button>
          </div>

          {!editing && (
            <div className="segmented" role="radiogroup" aria-label="Tipo">
              {(['task', 'exam'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className={`segmented__opt${kind === k ? ' is-active' : ''}`}
                  onClick={() => setKind(k)}
                >
                  {k === 'task' ? 'Tarea' : 'Examen'}
                </button>
              ))}
            </div>
          )}

          <label className="field">
            <span className="field__label">Título</span>
            <input
              ref={titleRef}
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'task' ? 'Ejercicios 4–12, pág. 58' : 'Tema 1–2'}
              maxLength={120}
            />
          </label>

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
          </div>

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
              <textarea className="input textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tema 2" rows={2} />
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

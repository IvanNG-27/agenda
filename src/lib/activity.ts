// Historial de lo que hay en un grupo: qué ha cambiado al editar una tarea, un examen o una nota.
// Los valores se guardan ya escritos para leerlos (fechas, nombre de la asignatura…): así se entienden aunque luego
// se borre la asignatura o cambie algo más.
import type { Change, Exam, Note, NoteItem, State, Task } from '../data/types';
import { shortDate } from './dates';

const MAX = 200;
const MAX_CHANGES = 10;
const cut = (s = '') => (s.length > MAX ? s.slice(0, MAX - 1) + '…' : s);
const subjectName = (s: State, id: string) => s.subjects.find((x) => x.id === id)?.name ?? '';

/** Cómo se dice cada campo en el historial ("cambió la fecha", "añadió las notas"…). */
export const FIELD_LABEL: Record<string, string> = {
  title: 'el título',
  subject: 'la asignatura',
  due: 'la entrega',
  date: 'la fecha',
  time: 'la hora',
  prep: 'el repaso',
  notes: 'las notas',
  text: 'el texto',
  items: 'la lista',
  color: 'el color',
  pinned: 'fijada',
};

function add(out: Change[], f: string, a?: string, b?: string) {
  if ((a ?? '') !== (b ?? '')) out.push({ f, from: cut(a ?? ''), to: cut(b ?? '') });
}

export function taskChanges(s: State, a: Task, b: Task): Change[] {
  const out: Change[] = [];
  add(out, 'title', a.title, b.title);
  if (a.subjectId !== b.subjectId) add(out, 'subject', subjectName(s, a.subjectId), subjectName(s, b.subjectId));
  add(out, 'due', shortDate(a.dueDate), shortDate(b.dueDate));
  add(out, 'notes', a.notes, b.notes);
  return out.slice(0, MAX_CHANGES);
}

export function examChanges(s: State, a: Exam, b: Exam): Change[] {
  const out: Change[] = [];
  add(out, 'title', a.title, b.title);
  if (a.subjectId !== b.subjectId) add(out, 'subject', subjectName(s, a.subjectId), subjectName(s, b.subjectId));
  add(out, 'date', shortDate(a.date), shortDate(b.date));
  add(out, 'time', a.time, b.time);
  add(out, 'prep', `${a.prep} %`, `${b.prep} %`);
  return out.slice(0, MAX_CHANGES);
}

/** Lista de una nota: "✓ Pan, + Leche, − Huevos" (marcado, añadido, quitado). */
function itemsSummary(a: NoteItem[] = [], b: NoteItem[] = []): string {
  const parts: string[] = [];
  for (const it of b) {
    const old = a.find((x) => x.text === it.text);
    if (!old) parts.push(`+ ${it.text}`);
    else if (old.done !== it.done) parts.push(`${it.done ? '✓' : '○'} ${it.text}`);
  }
  for (const it of a) if (!b.some((x) => x.text === it.text)) parts.push(`− ${it.text}`);
  return parts.join(', ');
}

export function noteChanges(a: Note, b: Note): Change[] {
  const out: Change[] = [];
  add(out, 'title', a.title, b.title);
  add(out, 'text', a.text, b.text);
  const items = itemsSummary(a.items, b.items);
  if (items) out.push({ f: 'items', from: '', to: cut(items) });
  add(out, 'color', a.color, b.color);
  add(out, 'pinned', a.pinned ? 'sí' : 'no', b.pinned ? 'sí' : 'no');
  return out.slice(0, MAX_CHANGES);
}

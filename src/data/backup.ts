// Copias de seguridad: exportar el estado a un .json e importarlo validando cada campo.
import type { AgendaEvent, Exam, State, Subject, Task } from './types';
import { initialState, PALETTE } from './defaults';
import { todayISO } from '../lib/dates';
import { EVENT_KINDS } from '../lib/events';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const COLORS = new Set(PALETTE.map((p) => p.token));
const KINDS = new Set<string>(EVENT_KINDS.map((k) => k.kind));
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

export function downloadBackup(state: State) {
  const payload = { app: 'nocta', exportedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nocta-copia-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.slice(0, max) : undefined;

const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];

/** Lee una copia (.json) y devuelve un estado válido. Lanza un Error con un mensaje para el usuario. */
export function parseBackup(text: string): State {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es una copia de Nocta.');
  }
  const obj = raw as Record<string, unknown>;
  const data = (obj && typeof obj === 'object' && 'data' in obj ? obj.data : obj) as Record<string, unknown>;
  if (!data || typeof data !== 'object' || data.version !== 1 || !Array.isArray(data.tasks)) {
    throw new Error('El archivo no es una copia de Nocta.');
  }

  const base = initialState();
  const subjects = arr(data.subjects).flatMap((s) => cleanSubject(s) ?? []);
  const tasks = arr(data.tasks).flatMap((t) => cleanTask(t) ?? []);
  const exams = arr(data.exams).flatMap((e) => cleanExam(e) ?? []);
  const events = arr(data.events).flatMap((e) => cleanEvent(e) ?? []); // las copias de antes de la 1.3.0 no tienen

  return {
    version: 1,
    userName: typeof data.userName === 'string' ? data.userName.slice(0, 40) : base.userName,
    subjects,
    tasks,
    exams,
    events,
  };
}

// Validación de cada elemento: se usa al importar copias y con los datos que llegan de Firebase.

export function cleanSubject(s: Record<string, unknown>): Subject | null {
  const id = str(s.id, 60);
  const name = str(s.name, 60);
  if (!id || !name) return null;
  const color = typeof s.color === 'string' && COLORS.has(s.color) ? s.color : PALETTE[0].token;
  return { id, name, short: str(s.short, 12) ?? name.slice(0, 12), color };
}

export function cleanTask(t: Record<string, unknown>): Task | null {
  const id = str(t.id, 60);
  const title = str(t.title, 120);
  const subjectId = str(t.subjectId, 60);
  const dueDate = typeof t.dueDate === 'string' && ISO.test(t.dueDate) ? t.dueDate : undefined;
  if (!id || !title || !subjectId || !dueDate) return null;
  const done = t.done === true;
  const doneAt = done && typeof t.doneAt === 'string' && ISO.test(t.doneAt) ? t.doneAt : undefined;
  return { id, title, subjectId, dueDate, done, doneAt, notes: str(t.notes, 2000) };
}

export function cleanExam(e: Record<string, unknown>): Exam | null {
  const id = str(e.id, 60);
  const title = str(e.title, 120);
  const subjectId = str(e.subjectId, 60);
  const date = typeof e.date === 'string' && ISO.test(e.date) ? e.date : undefined;
  if (!id || !title || !subjectId || !date) return null;
  const prep = typeof e.prep === 'number' && Number.isFinite(e.prep) ? Math.min(100, Math.max(0, Math.round(e.prep))) : 0;
  return { id, title, subjectId, date, time: str(e.time, 30), prep };
}

export function cleanEvent(e: Record<string, unknown>): AgendaEvent | null {
  const id = str(e.id, 60);
  const title = str(e.title, 120);
  const date = typeof e.date === 'string' && ISO.test(e.date) ? e.date : undefined;
  if (!id || !title || !date) return null;
  const kind = typeof e.kind === 'string' && KINDS.has(e.kind) ? (e.kind as AgendaEvent['kind']) : 'otro';
  const time = typeof e.time === 'string' && HOUR.test(e.time) ? e.time : undefined;
  return { id, title, kind, date, time, place: str(e.place, 120), notes: str(e.notes, 2000), yearly: e.yearly === true || undefined };
}

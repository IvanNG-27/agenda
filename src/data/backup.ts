// Copias de seguridad: exportar el estado a un .json e importarlo validando cada campo.
import type { Exam, State, Subject, Task } from './types';
import { initialState, PALETTE } from './defaults';
import { todayISO } from '../lib/dates';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const COLORS = new Set(PALETTE.map((p) => p.token));

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
  const subjects: Subject[] = arr(data.subjects).flatMap((s) => {
    const id = str(s.id, 60);
    const name = str(s.name, 60);
    if (!id || !name) return [];
    const color = typeof s.color === 'string' && COLORS.has(s.color) ? s.color : PALETTE[0].token;
    return [{ id, name, short: str(s.short, 12) ?? name.slice(0, 12), color }];
  });

  const tasks: Task[] = arr(data.tasks).flatMap((t) => {
    const id = str(t.id, 60);
    const title = str(t.title, 120);
    const subjectId = str(t.subjectId, 60);
    const dueDate = typeof t.dueDate === 'string' && ISO.test(t.dueDate) ? t.dueDate : undefined;
    if (!id || !title || !subjectId || !dueDate) return [];
    const done = t.done === true;
    const doneAt = done && typeof t.doneAt === 'string' && ISO.test(t.doneAt) ? t.doneAt : undefined;
    return [{ id, title, subjectId, dueDate, done, doneAt, notes: str(t.notes, 2000) }];
  });

  const exams: Exam[] = arr(data.exams).flatMap((e) => {
    const id = str(e.id, 60);
    const title = str(e.title, 120);
    const subjectId = str(e.subjectId, 60);
    const date = typeof e.date === 'string' && ISO.test(e.date) ? e.date : undefined;
    if (!id || !title || !subjectId || !date) return [];
    const prep = typeof e.prep === 'number' && Number.isFinite(e.prep) ? Math.min(100, Math.max(0, Math.round(e.prep))) : 0;
    return [{ id, title, subjectId, date, time: str(e.time, 30), prep }];
  });

  return {
    version: 1,
    userName: typeof data.userName === 'string' ? data.userName.slice(0, 40) : base.userName,
    subjects: subjects.length ? subjects : base.subjects,
    tasks,
    exams,
  };
}

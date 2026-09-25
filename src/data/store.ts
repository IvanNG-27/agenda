import { useEffect, useState, useSyncExternalStore } from 'react';
import { initialState } from './defaults';
import type { Exam, State, Subject, Task } from './types';
import { todayISO } from '../lib/dates';

const KEY = 'nocta:v1';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch {
    /* datos corruptos o almacenamiento bloqueado: empezamos de cero */
  }
  return initialState();
}

let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento: la app sigue funcionando en memoria */
  }
  listeners.forEach((l) => l());
}

// Sincroniza entre pestañas abiertas
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = load();
    listeners.forEach((l) => l());
  }
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useStore = () => useSyncExternalStore(subscribe, () => state);
export const getState = () => state;

/** Destino de los cambios en la nube (Firebase) mientras hay sesión iniciada. */
export type Remote = {
  putTask(t: Task): void;
  removeTask(id: string): void;
  putExam(e: Exam): void;
  removeExam(id: string): void;
  putSubject(s: Subject, order: number): void;
  removeSubject(id: string): void;
  putProfile(p: { userName: string }): void;
  replaceAll(prev: State, next: State): void;
};

let remote: Remote | null = null;
export const setRemote = (r: Remote | null) => {
  remote = r;
};

/** Aplica datos que llegan de la nube sin volver a enviarlos. */
export function applyRemote(patch: Partial<Pick<State, 'userName' | 'subjects' | 'tasks' | 'exams'>>) {
  set({ ...state, ...patch });
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const actions = {
  addTask(t: Omit<Task, 'id' | 'done'>) {
    const task: Task = { ...t, id: uid(), done: false };
    set({ ...state, tasks: [...state.tasks, task] });
    remote?.putTask(task);
  },
  updateTask(id: string, patch: Partial<Task>) {
    set({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    const task = state.tasks.find((t) => t.id === id);
    if (task) remote?.putTask(task);
  },
  setDone(id: string, done: boolean) {
    actions.updateTask(id, { done, doneAt: done ? todayISO() : undefined });
  },
  toggleTask(id: string) {
    const t = state.tasks.find((x) => x.id === id);
    if (t) actions.setDone(id, !t.done);
  },
  deleteTask(id: string) {
    set({ ...state, tasks: state.tasks.filter((t) => t.id !== id) });
    remote?.removeTask(id);
  },
  addExam(e: Omit<Exam, 'id'>) {
    const exam: Exam = { ...e, id: uid() };
    set({ ...state, exams: [...state.exams, exam] });
    remote?.putExam(exam);
  },
  updateExam(id: string, patch: Partial<Exam>) {
    set({ ...state, exams: state.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
    const exam = state.exams.find((e) => e.id === id);
    if (exam) remote?.putExam(exam);
  },
  deleteExam(id: string) {
    set({ ...state, exams: state.exams.filter((e) => e.id !== id) });
    remote?.removeExam(id);
  },
  updateSubject(id: string, patch: Partial<Subject>) {
    set({ ...state, subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    const i = state.subjects.findIndex((s) => s.id === id);
    if (i >= 0) remote?.putSubject(state.subjects[i], i);
  },
  addSubject(s: Omit<Subject, 'id'>) {
    const subject: Subject = { ...s, id: uid() };
    set({ ...state, subjects: [...state.subjects, subject] });
    remote?.putSubject(subject, state.subjects.length - 1);
  },
  /** Elimina la asignatura junto con sus tareas y exámenes. */
  deleteSubject(id: string) {
    const tasks = state.tasks.filter((t) => t.subjectId === id);
    const exams = state.exams.filter((e) => e.subjectId === id);
    set({
      ...state,
      subjects: state.subjects.filter((s) => s.id !== id),
      tasks: state.tasks.filter((t) => t.subjectId !== id),
      exams: state.exams.filter((e) => e.subjectId !== id),
    });
    if (remote) {
      remote.removeSubject(id);
      tasks.forEach((t) => remote?.removeTask(t.id));
      exams.forEach((e) => remote?.removeExam(e.id));
      // Reescribe el orden para que siga siendo 0, 1, 2… en la nube
      state.subjects.forEach((s, i) => remote?.putSubject(s, i));
    }
  },
  setUserName(userName: string) {
    set({ ...state, userName });
    remote?.putProfile({ userName });
  },
  replaceAll(next: State) {
    const prev = state;
    set(next);
    remote?.replaceAll(prev, next);
  },
};

/** Fecha de hoy, que se actualiza sola al pasar la medianoche o al volver a la app. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const tick = () => setToday(todayISO());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}

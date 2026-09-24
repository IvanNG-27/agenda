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

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const actions = {
  addTask(t: Omit<Task, 'id' | 'done'>) {
    set({ ...state, tasks: [...state.tasks, { ...t, id: uid(), done: false }] });
  },
  updateTask(id: string, patch: Partial<Task>) {
    set({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
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
  },
  addExam(e: Omit<Exam, 'id'>) {
    set({ ...state, exams: [...state.exams, { ...e, id: uid() }] });
  },
  updateExam(id: string, patch: Partial<Exam>) {
    set({ ...state, exams: state.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  },
  deleteExam(id: string) {
    set({ ...state, exams: state.exams.filter((e) => e.id !== id) });
  },
  updateSubject(id: string, patch: Partial<Subject>) {
    set({ ...state, subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  },
  setUserName(userName: string) {
    set({ ...state, userName });
  },
  replaceAll(next: State) {
    set(next);
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

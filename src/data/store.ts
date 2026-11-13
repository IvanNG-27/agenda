import { useEffect, useState, useSyncExternalStore } from 'react';
import { initialState } from './defaults';
import type { AgendaEvent, Exam, Group, Note, State, Subject, Task } from './types';
import { todayISO } from '../lib/dates';

const KEY = 'nocta:v1';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      // Lo guardado por versiones anteriores puede no traer eventos (1.3.0), rachas (1.4.0), notas (1.7.0) ni grupos (1.8.0)
      if (parsed && parsed.version === 1) {
        return {
          ...parsed,
          events: parsed.events ?? [],
          studyLog: parsed.studyLog ?? [],
          notes: parsed.notes ?? [],
          groups: parsed.groups ?? [],
          groupDone: parsed.groupDone ?? {},
          groupStudy: parsed.groupStudy ?? {},
        };
      }
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
/** Para módulos fuera de React (recordatorios): avisa en cada cambio de datos. */
export const subscribeStore = subscribe;
export const getState = () => state;

// ---------- Grupos y permisos ----------

type Item = { group?: string };
export type ListKey = 'subjects' | 'tasks' | 'exams' | 'events' | 'notes';
const LISTS: ListKey[] = ['subjects', 'tasks', 'exams', 'events', 'notes'];

export const groupOf = (s: State, id?: string): Group | undefined => (id ? s.groups.find((g) => g.id === id) : undefined);

/** ¿Puede esta persona cambiar el elemento? Lo personal, siempre; lo de un grupo, si administra o edita en él. */
export function canEdit(item: Item | undefined, s: State = state): boolean {
  if (!item?.group) return true;
  const role = groupOf(s, item.group)?.role;
  return role === 'owner' || role === 'editor';
}

/** Grupos en los que puede añadir cosas. */
export const editableGroups = (s: State = state) => s.groups.filter((g) => g.role === 'owner' || g.role === 'editor');

/** Solo lo personal (copias de seguridad, fusión al iniciar sesión…). */
export function personalOnly(s: State): State {
  const own = <T extends Item>(list: T[]) => list.filter((x) => !x.group);
  return { ...s, subjects: own(s.subjects), tasks: own(s.tasks), exams: own(s.exams), events: own(s.events), notes: own(s.notes), groups: [], groupDone: {}, groupStudy: {} };
}

/** Destino de los cambios en la nube (Firebase) mientras hay sesión iniciada. Cada elemento sabe si es de un grupo. */
export type Remote = {
  putTask(t: Task): void;
  removeTask(t: Task): void;
  putExam(e: Exam): void;
  removeExam(e: Exam): void;
  putEvent(e: AgendaEvent): void;
  removeEvent(e: AgendaEvent): void;
  putNote(n: Note): void;
  removeNote(n: Note): void;
  putSubject(s: Subject, order: number): void;
  removeSubject(s: Subject): void;
  putProfile(p: { userName: string }): void;
  putStudyLog(days: string[]): void;
  /** Marca (fecha) o desmarca (null) como terminada para esta persona una tarea de grupo */
  putGroupDone(group: string, task: string, doneAt: string | null): void;
  /** Días que esta persona ha estudiado para un examen de grupo (vacío = ninguno) */
  putGroupStudy(group: string, exam: string, days: string[]): void;
  /** Solo lo personal: los grupos no se tocan al importar una copia */
  replaceAll(prev: State, next: State): void;
};

let remote: Remote | null = null;
export const setRemote = (r: Remote | null) => {
  remote = r;
};

/** Aplica datos personales que llegan de la nube sin volver a enviarlos. Lo de los grupos se conserva. */
export function applyRemote(patch: Partial<Pick<State, 'userName' | 'studyLog' | ListKey>>) {
  const next = { ...state, ...patch } as State;
  for (const key of LISTS) {
    if (patch[key]) (next[key] as Item[]) = [...(patch[key] as Item[]), ...(state[key] as Item[]).filter((x) => x.group)];
  }
  set(next);
}

// Tareas de grupo: hecha o pendiente es de cada persona (state.groupDone), no del grupo.
const doneKey = (t: { id: string; group?: string }) => `${t.group}/${t.id}`;
const withMyDone = (t: Task, map: Record<string, string>): Task => {
  if (!t.group) return t;
  const doneAt = map[doneKey(t)];
  return { ...t, done: !!doneAt, doneAt };
};

// Exámenes de grupo: los días estudiados (y la racha) son de cada persona (state.groupStudy).
const withMyStudy = (e: Exam, map: Record<string, string[]>): Exam => {
  if (!e.group) return e;
  const days = map[doneKey(e)];
  return { ...e, studyDays: days?.length ? days : undefined };
};

/** Aplica lo que llega de la nube para un grupo: sustituye sus elementos de esa lista. */
export function applyGroupList(groupId: string, key: ListKey, items: Item[]) {
  const others = (state[key] as Item[]).filter((x) => x.group !== groupId);
  let mine: Item[] = items.map((x) => ({ ...x, group: groupId }));
  if (key === 'tasks') mine = mine.map((t) => withMyDone(t as Task, state.groupDone));
  if (key === 'exams') mine = mine.map((e) => withMyStudy(e as Exam, state.groupStudy));
  set({ ...state, [key]: [...others, ...mine] } as State);
}

/** Días estudiados por esta persona en exámenes de grupo (de la nube). */
export function applyGroupStudy(groupStudy: Record<string, string[]>) {
  set({ ...state, groupStudy, exams: state.exams.map((e) => withMyStudy(e, groupStudy)) });
}

/** Tareas de grupo que esta persona ha terminado (de la nube). */
export function applyGroupDone(groupDone: Record<string, string>) {
  set({ ...state, groupDone, tasks: state.tasks.map((t) => withMyDone(t, groupDone)) });
}

/** Datos del propio grupo (nombre, miembros, papel). Si no estaba, se añade. */
export function applyGroup(group: Group) {
  const exists = state.groups.some((g) => g.id === group.id);
  set({ ...state, groups: exists ? state.groups.map((g) => (g.id === group.id ? group : g)) : [...state.groups, group] });
}

/** Quita de este dispositivo un grupo y todo lo suyo (al salir, ser expulsado o borrarse el grupo). */
export function dropGroup(groupId: string) {
  const other = ([k]: [string, unknown]) => !k.startsWith(`${groupId}/`);
  const groupDone = Object.fromEntries(Object.entries(state.groupDone).filter(other));
  const groupStudy = Object.fromEntries(Object.entries(state.groupStudy).filter(other));
  const next = { ...state, groups: state.groups.filter((g) => g.id !== groupId), groupDone, groupStudy } as State;
  for (const key of LISTS) (next[key] as Item[]) = (state[key] as Item[]).filter((x) => x.group !== groupId);
  set(next);
}

/** Borra los datos de este dispositivo sin tocar la nube (al cerrar sesión o al entrar otra cuenta). */
export function resetLocal() {
  set(initialState());
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Posición de la asignatura entre las de su mismo sitio (personal o el mismo grupo), para el orden en la nube. */
const orderOf = (s: Subject, list: Subject[] = state.subjects) => list.filter((x) => x.group === s.group).indexOf(s);

export const actions = {
  addTask(t: Omit<Task, 'id' | 'done'>) {
    if (!canEdit(t)) return;
    const task: Task = { ...t, id: uid(), done: false };
    set({ ...state, tasks: [...state.tasks, task] });
    remote?.putTask(task);
  },
  updateTask(id: string, patch: Partial<Task>) {
    const current = state.tasks.find((t) => t.id === id);
    // En una tarea de grupo, hecha/pendiente es solo de esta persona: va aparte
    if (current?.group && 'done' in patch) {
      const { done, doneAt: _doneAt, ...rest } = patch;
      void _doneAt;
      actions.setDone(id, !!done);
      if (!Object.keys(rest).length) return;
      patch = rest;
    }
    if (!canEdit(current)) return;
    set({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, group: t.group } : t)) });
    const task = state.tasks.find((t) => t.id === id);
    if (task) remote?.putTask(task);
  },
  setDone(id: string, done: boolean) {
    const t = state.tasks.find((x) => x.id === id);
    if (t?.group) {
      // Tarea de grupo: cualquier miembro (también quien solo lee) la marca solo para sí
      const key = doneKey(t);
      const groupDone = { ...state.groupDone };
      if (done) groupDone[key] = todayISO();
      else delete groupDone[key];
      set({ ...state, groupDone, tasks: state.tasks.map((x) => (x.id === id && x.group === t.group ? withMyDone(x, groupDone) : x)) });
      remote?.putGroupDone(t.group, t.id, groupDone[key] ?? null);
      return;
    }
    actions.updateTask(id, { done, doneAt: done ? todayISO() : undefined });
  },
  toggleTask(id: string) {
    const t = state.tasks.find((x) => x.id === id);
    if (t) actions.setDone(id, !t.done);
  },
  deleteTask(id: string) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task || !canEdit(task)) return;
    set({ ...state, tasks: state.tasks.filter((t) => t.id !== id) });
    remote?.removeTask(task);
  },
  addExam(e: Omit<Exam, 'id'>) {
    if (!canEdit(e)) return;
    const exam: Exam = { ...e, id: uid() };
    set({ ...state, exams: [...state.exams, exam] });
    remote?.putExam(exam);
  },
  updateExam(id: string, patch: Partial<Exam>) {
    if (!canEdit(state.exams.find((e) => e.id === id))) return;
    set({ ...state, exams: state.exams.map((e) => (e.id === id ? { ...e, ...patch, group: e.group } : e)) });
    const exam = state.exams.find((e) => e.id === id);
    if (exam) remote?.putExam(exam);
  },
  deleteExam(id: string) {
    const exam = state.exams.find((e) => e.id === id);
    if (!exam || !canEdit(exam)) return;
    set({ ...state, exams: state.exams.filter((e) => e.id !== id) });
    remote?.removeExam(exam);
  },
  /**
   * Marca o desmarca "He estudiado hoy" en un examen. En los de grupo también, pero solo para esta persona:
   * sus días van aparte (groupStudy) y la racha es de cada uno.
   */
  toggleStudied(examId: string, today: string) {
    const exam = state.exams.find((e) => e.id === examId);
    if (!exam) return;
    const days = exam.studyDays ?? [];
    const studied = !days.includes(today);
    const studyDays = studied ? [...days, today].sort() : days.filter((d) => d !== today);
    const otherToday = state.exams.some((e) => e.id !== examId && e.studyDays?.includes(today));
    const studyLog =
      studied && !state.studyLog.includes(today)
        ? [...state.studyLog, today].sort()
        : !studied && !otherToday
          ? state.studyLog.filter((d) => d !== today)
          : state.studyLog;
    if (exam.group) {
      const key = doneKey(exam);
      const groupStudy = { ...state.groupStudy };
      if (studyDays.length) groupStudy[key] = studyDays;
      else delete groupStudy[key];
      set({ ...state, groupStudy, exams: state.exams.map((e) => (e.id === examId && e.group === exam.group ? withMyStudy(e, groupStudy) : e)) });
      remote?.putGroupStudy(exam.group, exam.id, studyDays);
    } else {
      actions.updateExam(examId, { studyDays });
    }
    if (studyLog !== state.studyLog) {
      set({ ...state, studyLog });
      remote?.putStudyLog(studyLog);
    }
  },
  addEvent(e: Omit<AgendaEvent, 'id'>) {
    if (!canEdit(e)) return;
    const event: AgendaEvent = { ...e, id: uid() };
    set({ ...state, events: [...state.events, event] });
    remote?.putEvent(event);
  },
  updateEvent(id: string, patch: Partial<AgendaEvent>) {
    if (!canEdit(state.events.find((e) => e.id === id))) return;
    set({ ...state, events: state.events.map((e) => (e.id === id ? { ...e, ...patch, group: e.group } : e)) });
    const event = state.events.find((e) => e.id === id);
    if (event) remote?.putEvent(event);
  },
  deleteEvent(id: string) {
    const event = state.events.find((e) => e.id === id);
    if (!event || !canEdit(event)) return;
    set({ ...state, events: state.events.filter((e) => e.id !== id) });
    remote?.removeEvent(event);
  },
  /** Crea una nota y devuelve su id. */
  addNote(n: Omit<Note, 'id' | 'updatedAt'>): string {
    if (!canEdit(n)) return '';
    const note: Note = { ...n, id: uid(), updatedAt: Date.now() };
    set({ ...state, notes: [...state.notes, note] });
    remote?.putNote(note);
    return note.id;
  },
  updateNote(id: string, patch: Partial<Omit<Note, 'id'>>) {
    if (!canEdit(state.notes.find((n) => n.id === id))) return;
    set({ ...state, notes: state.notes.map((n) => (n.id === id ? { ...n, ...patch, group: n.group, updatedAt: Date.now() } : n)) });
    const note = state.notes.find((n) => n.id === id);
    if (note) remote?.putNote(note);
  },
  /** Marca o desmarca un punto de la lista de una nota. */
  toggleNoteItem(id: string, index: number) {
    const note = state.notes.find((n) => n.id === id);
    if (!note?.items?.[index]) return;
    actions.updateNote(id, { items: note.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)) });
  },
  deleteNote(id: string) {
    const note = state.notes.find((n) => n.id === id);
    if (!note || !canEdit(note)) return;
    set({ ...state, notes: state.notes.filter((n) => n.id !== id) });
    remote?.removeNote(note);
  },
  updateSubject(id: string, patch: Partial<Subject>) {
    if (!canEdit(state.subjects.find((s) => s.id === id))) return;
    set({ ...state, subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...patch, group: s.group } : s)) });
    const subject = state.subjects.find((s) => s.id === id);
    if (subject) remote?.putSubject(subject, orderOf(subject));
  },
  addSubject(s: Omit<Subject, 'id'>) {
    if (!canEdit(s)) return;
    const subject: Subject = { ...s, id: uid() };
    set({ ...state, subjects: [...state.subjects, subject] });
    remote?.putSubject(subject, orderOf(subject));
  },
  /** Elimina la asignatura junto con sus tareas y exámenes. */
  deleteSubject(id: string) {
    const subject = state.subjects.find((s) => s.id === id);
    if (!subject || !canEdit(subject)) return;
    const tasks = state.tasks.filter((t) => t.subjectId === id);
    const exams = state.exams.filter((e) => e.subjectId === id);
    set({
      ...state,
      subjects: state.subjects.filter((s) => s.id !== id),
      tasks: state.tasks.filter((t) => t.subjectId !== id),
      exams: state.exams.filter((e) => e.subjectId !== id),
    });
    if (remote) {
      remote.removeSubject(subject);
      tasks.forEach((t) => remote?.removeTask(t));
      exams.forEach((e) => remote?.removeExam(e));
      // Reescribe el orden para que siga siendo 0, 1, 2… en la nube (solo las de su mismo sitio)
      state.subjects.filter((s) => s.group === subject.group).forEach((s, i) => remote?.putSubject(s, i));
    }
  },
  setUserName(userName: string) {
    set({ ...state, userName });
    remote?.putProfile({ userName });
  },
  /** Importar una copia: sustituye lo personal. Lo de los grupos no está en las copias y se conserva. */
  replaceAll(next: State) {
    const prev = personalOnly(state);
    const own = personalOnly(next);
    const merged = { ...own, groups: state.groups, groupDone: state.groupDone, groupStudy: state.groupStudy } as State;
    for (const key of LISTS) (merged[key] as Item[]) = [...(own[key] as Item[]), ...(state[key] as Item[]).filter((x) => x.group)];
    set(merged);
    remote?.replaceAll(prev, own);
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

export type Subject = {
  id: string;
  name: string; // "Acceso a Datos"
  short: string; // "AD"
  color: string; // token subj-*
};

export type Task = {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string; // ISO yyyy-mm-dd
  done: boolean;
  doneAt?: string; // ISO yyyy-mm-dd
  notes?: string;
};

export type Exam = {
  id: string;
  title: string;
  subjectId: string;
  date: string; // ISO yyyy-mm-dd
  time?: string; // "1ª hora"
  prep: number; // 0–100, % de repaso
};

export type EventKind = 'cumple' | 'comida' | 'quedada' | 'medico' | 'importante' | 'otro';

/** Evento personal del calendario: no depende de ninguna asignatura. */
export type AgendaEvent = {
  id: string;
  title: string;
  kind: EventKind;
  date: string; // ISO yyyy-mm-dd (en los anuales, la primera vez)
  time?: string; // "HH:MM"; sin hora = todo el día
  place?: string;
  notes?: string;
  /** Se repite cada año el mismo día (cumpleaños, aniversarios…) */
  yearly?: boolean;
};

export type State = {
  version: 1;
  userName: string;
  subjects: Subject[];
  tasks: Task[];
  exams: Exam[];
  events: AgendaEvent[];
};

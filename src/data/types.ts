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

export type State = {
  version: 1;
  userName: string;
  subjects: Subject[];
  tasks: Task[];
  exams: Exam[];
};

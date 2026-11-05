// Reglas de comportamiento (especificación §5)
import type { Exam, Subject, Task } from '../data/types';
import { addDays, diffDays, endOfWeek } from './dates';

/** Una tarea hecha se ve tachada hasta las 00:00 del día siguiente. */
export const isVisible = (t: Task, today: string) => !t.done || t.doneAt === today;

/** No hecha y con entrega en menos de 48 h (o vencida). */
export const isUrgent = (t: Task, today: string) => !t.done && diffDays(today, t.dueDate) <= 1;

export const byDue = (a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate);

export const byDate = (a: Exam, b: Exam) =>
  a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');

export type Groups = {
  late: Task[];
  today: Task[];
  tomorrow: Task[];
  week: Task[];
  later: Task[];
};

export function groupForToday(tasks: Task[], today: string): Groups {
  const tomorrow = addDays(today, 1);
  const sunday = endOfWeek(today);
  const g: Groups = { late: [], today: [], tomorrow: [], week: [], later: [] };
  for (const t of [...tasks].sort(byDue)) {
    if (t.dueDate < today) {
      if (!t.done) g.late.push(t);
    } else if (!isVisible(t, today)) {
      continue;
    } else if (t.dueDate === today) g.today.push(t);
    else if (t.dueDate === tomorrow) g.tomorrow.push(t);
    else if (t.dueDate <= sunday) g.week.push(t);
    else g.later.push(t);
  }
  return g;
}

export const upcomingExams = (exams: Exam[], today: string) =>
  exams.filter((e) => e.date >= today).sort(byDate);

export const pastExams = (exams: Exam[], today: string) =>
  exams.filter((e) => e.date < today).sort((a, b) => byDate(b, a));

export const pendingCount = (tasks: Task[], subjectId: string) =>
  tasks.filter((t) => !t.done && t.subjectId === subjectId).length;

export const subjectMap = (subjects: Subject[]) => new Map(subjects.map((s) => [s.id, s]));

/** CSS de un color de asignatura: los de la paleta son variables de tokens.css; los personalizados, "#rrggbb". */
export const colorCss = (color: string) => (color.startsWith('#') ? color : `var(--${color})`);

export const colorVar = (s?: Subject) => (s ? colorCss(s.color) : 'var(--ink-muted)');

/** Luminancia relativa (0 negro – 1 blanco) de un color personalizado. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto que se lee encima del color: oscuro sobre los claros (toda la paleta), blanco sobre los oscuros.
 *  0,18 es donde los dos dan el mismo contraste WCAG con el texto oscuro de la app. */
export const inkOn = (color: string) => (color.startsWith('#') && luminance(color) < 0.18 ? '#ffffff' : 'var(--accent-ink)');

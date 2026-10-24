// Recordatorios de tareas, exámenes y eventos. Cada uno se guarda como minutos respecto al "inicio" del elemento:
// la hora del evento si la tiene, o las 00:00 de su día si es de todo el día (tareas, exámenes, eventos sin hora).
import type { State } from '../data/types';
import { diffDays, parts } from './dates';
import { kindInfo, nextOccurrence, yearsOn } from './events';

export type ReminderOption = { minutes: number; label: string };

/** Elementos con hora (eventos con hora) */
export const TIMED_OPTIONS: ReminderOption[] = [
  { minutes: 0, label: 'A la hora' },
  { minutes: -10, label: '10 min antes' },
  { minutes: -30, label: '30 min antes' },
  { minutes: -60, label: '1 h antes' },
  { minutes: -1440, label: '1 día antes' },
];

/** Elementos de todo el día (tareas, exámenes y eventos sin hora) */
export const DAY_OPTIONS: ReminderOption[] = [
  { minutes: 540, label: 'Ese día a las 9:00' },
  { minutes: -300, label: 'El día antes a las 19:00' },
  { minutes: -1740, label: '2 días antes a las 19:00' },
  { minutes: -8940, label: '1 semana antes a las 19:00' },
];

export const MAX_REMINDERS = 3;
const ALLOWED = new Set([...TIMED_OPTIONS, ...DAY_OPTIONS].map((o) => o.minutes));

export const optionsFor = (timed: boolean) => (timed ? TIMED_OPTIONS : DAY_OPTIONS);

/** Deja solo valores válidos para ese tipo de elemento, sin repetir, como mucho 3 y en orden. */
export function cleanReminders(v: unknown, timed?: boolean): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const valid = timed === undefined ? ALLOWED : new Set(optionsFor(timed).map((o) => o.minutes));
  const list = [...new Set(v.filter((m): m is number => typeof m === 'number' && valid.has(m)))].sort((a, b) => a - b);
  return list.length ? list.slice(0, MAX_REMINDERS) : undefined;
}

export type Reminder = {
  /** Único y estable: el mismo recordatorio tiene siempre el mismo id en todos los dispositivos */
  key: string;
  at: number; // instante del aviso (ms)
  title: string;
  body: string;
  yearly: boolean;
};

/** Instante local de una fecha ISO a una hora (minutos desde las 00:00, puede ser negativo). */
function instant(iso: string, minutesFromMidnight: number): number {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d, 0, minutesFromMidnight).getTime();
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const isoOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "hoy", "mañana", "en 2 días", "dentro de una semana" según el día del aviso y el del elemento. */
function whenText(fireAt: number, date: string, time?: string): string {
  const days = diffDays(isoOf(fireAt), date);
  const day = days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : days === 7 ? 'Dentro de una semana' : `En ${days} días`;
  return time ? `${day} a las ${time}` : day;
}

const safeId = (s: string) => s.replace(/[^A-Za-z0-9-]/g, '-').slice(0, 60);
const code = (m: number) => (m < 0 ? `m${-m}` : `p${m}`);

/**
 * Todos los recordatorios pendientes a partir de `from` (ms), con su instante, título y texto.
 * Los eventos anuales usan su próxima fecha. Las tareas hechas no avisan.
 */
export function upcomingReminders(state: State, from: number): Reminder[] {
  const out: Reminder[] = [];
  const subjects = new Map(state.subjects.map((s) => [s.id, s]));
  const today = isoOf(from);
  const add = (kind: string, id: string, date: string, time: string | undefined, list: number[] | undefined, title: string, extra: string[], yearly = false) => {
    for (const m of cleanReminders(list, !!time) ?? []) {
      const at = instant(date, (time ? toMinutes(time) : 0) + m);
      if (at < from) continue;
      out.push({
        key: `${kind}_${safeId(id)}_${code(m)}`,
        at,
        title,
        body: [whenText(at, date, time), ...extra].filter(Boolean).join(' · '),
        yearly,
      });
    }
  };

  for (const t of state.tasks) {
    if (t.done) continue;
    add('task', t.id, t.dueDate, undefined, t.reminders, `📚 Entrega: ${t.title}`, [subjects.get(t.subjectId)?.name ?? '']);
  }
  for (const e of state.exams) {
    add('exam', e.id, e.date, undefined, e.reminders, `📝 Examen: ${e.title}`, [subjects.get(e.subjectId)?.name ?? '', e.time ?? '']);
  }
  for (const ev of state.events) {
    // Los anuales, en su próxima fecha (la de este año si aún no ha pasado el aviso, si no la del siguiente)
    let date = ev.yearly ? nextOccurrence(ev, today) : ev.date;
    if (!date) continue;
    const years = (d: string) => yearsOn(ev, d);
    const info = kindInfo(ev.kind);
    const extra = (d: string) => [ev.place ?? '', years(d) ? (ev.kind === 'cumple' ? `cumple ${years(d)}` : `${years(d)} años`) : ''];
    const before = out.length;
    add('event', ev.id, date, ev.time, ev.reminders, `${info.emoji} ${ev.title}`, extra(date), !!ev.yearly);
    // Si en un anual todos los avisos de este año ya pasaron, se programan los del año que viene
    if (ev.yearly && out.length === before && ev.reminders?.length) {
      date = nextOccurrence(ev, `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`);
      if (date) add('event', ev.id, date, ev.time, ev.reminders, `${info.emoji} ${ev.title}`, extra(date), true);
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

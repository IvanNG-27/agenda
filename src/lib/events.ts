// Eventos personales: tipos, colores y cuándo ocurren (los anuales se repiten cada año).
import type { AgendaEvent, EventKind } from '../data/types';
import { addDays } from './dates';

export const EVENT_KINDS: { kind: EventKind; label: string; emoji: string; color: string; example: string }[] = [
  { kind: 'cumple', label: 'Cumpleaños', emoji: '🎂', color: 'subj-rosa', example: 'Cumple de Laura' },
  { kind: 'comida', label: 'Comida', emoji: '🍽️', color: 'subj-ambar', example: 'Comida con la familia' },
  { kind: 'quedada', label: 'Quedada', emoji: '👋', color: 'subj-turquesa', example: 'Cine con Marta' },
  { kind: 'medico', label: 'Médico', emoji: '🩺', color: 'subj-azul', example: 'Revisión en el dentista' },
  { kind: 'importante', label: 'Día importante', emoji: '⭐', color: 'subj-amarillo', example: 'Viaje a Valencia' },
  { kind: 'otro', label: 'Otro', emoji: '📌', color: 'subj-lavanda', example: 'Renovar el DNI' },
];

export const kindInfo = (k: EventKind) => EVENT_KINDS.find((x) => x.kind === k) ?? EVENT_KINDS[EVENT_KINDS.length - 1];

export const eventColor = (ev: AgendaEvent) => `var(--${kindInfo(ev.kind).color})`;

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Día en que cae un evento anual el año `y` (el 29 de febrero pasa al 28 en los años no bisiestos). */
function inYear(date: string, y: number): string {
  const md = date.slice(5);
  return `${y}-${md === '02-29' && !isLeap(y) ? '02-28' : md}`;
}

export function occursOn(ev: AgendaEvent, day: string): boolean {
  if (!ev.yearly) return ev.date === day;
  return day >= ev.date && inYear(ev.date, Number(day.slice(0, 4))) === day;
}

/** Primero los de todo el día, después por hora. */
export const byTime = (a: AgendaEvent, b: AgendaEvent) =>
  (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title);

export const eventsOn = (events: AgendaEvent[], day: string) => events.filter((e) => occursOn(e, day)).sort(byTime);

/** Próxima vez que ocurre a partir de `from` (incluido), o null si ya pasó. */
export function nextOccurrence(ev: AgendaEvent, from: string): string | null {
  if (!ev.yearly) return ev.date >= from ? ev.date : null;
  if (from <= ev.date) return ev.date;
  const y = Number(from.slice(0, 4));
  const d = inYear(ev.date, y);
  return d >= from ? d : inYear(ev.date, y + 1);
}

export type Occurrence = { event: AgendaEvent; date: string };

/** Eventos de los próximos `days` días, hoy incluido, por fecha y hora. */
export function upcomingEvents(events: AgendaEvent[], today: string, days: number): Occurrence[] {
  const last = addDays(today, days - 1);
  return events
    .flatMap((event) => {
      const date = nextOccurrence(event, today);
      return date && date <= last ? [{ event, date }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a.event, b.event));
}

/** Años que se cumplen ese día en un evento anual con fecha de origen anterior ("cumple 20"), o null. */
export function yearsOn(ev: AgendaEvent, date: string): number | null {
  if (!ev.yearly) return null;
  const n = Number(date.slice(0, 4)) - Number(ev.date.slice(0, 4));
  return n > 0 ? n : null;
}

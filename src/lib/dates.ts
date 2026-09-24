// Fechas siempre como ISO local "yyyy-mm-dd". Las diferencias se calculan en UTC para evitar líos con el cambio de hora.

export const DOW_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DOW_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DOW_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

function utc(iso: string): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  return fromUtc(utc(iso) + n * 86400000);
}

/** Días naturales de `from` a `to` (positivo si `to` es posterior). */
export function diffDays(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / 86400000);
}

/** 0 = lunes … 6 = domingo */
export function weekday(iso: string): number {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export const startOfWeek = (iso: string) => addDays(iso, -weekday(iso));
export const endOfWeek = (iso: string) => addDays(iso, 6 - weekday(iso));

export function startOfMonth(iso: string): string {
  const [y, m] = parts(iso);
  return `${y}-${pad(m)}-01`;
}

export function addMonths(iso: string, n: number): string {
  const [y, m] = parts(iso);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
}

export function isoWeek(iso: string): number {
  const thursday = addDays(iso, 3 - weekday(iso));
  const [y] = parts(thursday);
  return Math.floor(diffDays(`${y}-01-01`, thursday) / 7) + 1;
}

export const day = (iso: string) => parts(iso)[2];
export const monthName = (iso: string) => MONTHS[parts(iso)[1] - 1];
export const year = (iso: string) => parts(iso)[0];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "lun 28 sep" */
export function shortDate(iso: string): string {
  return `${DOW_SHORT[weekday(iso)].toLowerCase()} ${day(iso)} ${MONTHS_SHORT[parts(iso)[1] - 1]}`;
}

/** "Jueves 24 septiembre" */
export function longDate(iso: string): string {
  return `${DOW_LONG[weekday(iso)]} ${day(iso)} ${monthName(iso)}`;
}

/** "24 sep" */
export function dayMonth(iso: string): string {
  return `${day(iso)} ${MONTHS_SHORT[parts(iso)[1] - 1]}`;
}

/** Fecha relativa de una tarea: "Hoy", "Mañana", "Vie", "Lun 28" o "2 oct". */
export function relativeDate(iso: string, today: string): string {
  const d = diffDays(today, iso);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  if (d > 1 && d < 7) return DOW_SHORT[weekday(iso)];
  if (Math.abs(d) < 28) return `${DOW_SHORT[weekday(iso)]} ${day(iso)}`;
  return dayMonth(iso);
}

export { cap };

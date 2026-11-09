import type { State, Subject } from './types';

/**
 * Colores de asignatura ya preparados (tokens de tokens.css), ordenados por tono para elegir cómodamente.
 * Todos claros, para que el texto oscuro se lea encima. Además se puede elegir cualquier color (#rrggbb).
 */
export const PALETTE: { token: string; name: string }[] = [
  { token: 'subj-rojo', name: 'Rojo' },
  { token: 'subj-frambuesa', name: 'Frambuesa' },
  { token: 'subj-coral', name: 'Coral' },
  { token: 'subj-naranja', name: 'Naranja' },
  { token: 'subj-melocoton', name: 'Melocotón' },
  { token: 'subj-ambar', name: 'Ámbar' },
  { token: 'subj-oro', name: 'Oro' },
  { token: 'subj-amarillo', name: 'Amarillo' },
  { token: 'subj-arena', name: 'Arena' },
  { token: 'subj-lima', name: 'Lima' },
  { token: 'subj-verde', name: 'Verde' },
  { token: 'subj-esmeralda', name: 'Esmeralda' },
  { token: 'subj-menta', name: 'Menta' },
  { token: 'subj-turquesa', name: 'Turquesa' },
  { token: 'subj-cian', name: 'Cian' },
  { token: 'subj-cielo', name: 'Cielo' },
  { token: 'subj-azul', name: 'Azul' },
  { token: 'subj-lavanda', name: 'Lavanda' },
  { token: 'subj-indigo', name: 'Índigo' },
  { token: 'subj-violeta', name: 'Violeta' },
  { token: 'subj-purpura', name: 'Púrpura' },
  { token: 'subj-fucsia', name: 'Fucsia' },
  { token: 'subj-rosa', name: 'Rosa' },
  { token: 'subj-gris', name: 'Gris' },
];

/** Orden en que se proponen colores a las asignaturas nuevas: bien distintos entre sí, no seguidos por tono. */
const ROTATION = [
  'subj-azul', 'subj-turquesa', 'subj-violeta', 'subj-rosa', 'subj-ambar', 'subj-lavanda', 'subj-arena', 'subj-verde',
  'subj-amarillo', 'subj-coral', 'subj-cian', 'subj-fucsia', 'subj-lima', 'subj-indigo', 'subj-naranja', 'subj-menta',
  'subj-purpura', 'subj-oro', 'subj-cielo', 'subj-frambuesa', 'subj-esmeralda', 'subj-melocoton', 'subj-rojo', 'subj-gris',
];

/** Color personalizado: "#rrggbb" en minúsculas. */
export const HEX = /^#[0-9a-f]{6}$/;
const TOKENS = new Set(PALETTE.map((p) => p.token));

/** Un color válido de asignatura: uno de la paleta o uno personalizado. */
export const isSubjectColor = (c: unknown): c is string => typeof c === 'string' && (TOKENS.has(c) || HEX.test(c));

/** Cada persona empieza sin asignaturas y añade las suyas en Ajustes. */
export const initialState = (): State => ({
  version: 1,
  userName: '',
  subjects: [],
  tasks: [],
  exams: [],
  events: [],
  studyLog: [],
  notes: [],
  groups: [],
  groupDone: {},
});

/** Primer color de la rotación que aún no usa ninguna asignatura (o el siguiente en rotación si están todos). */
export function nextColor(subjects: Subject[]): string {
  const used = new Set(subjects.map((s) => s.color));
  return ROTATION.find((t) => !used.has(t)) ?? ROTATION[subjects.length % ROTATION.length];
}

const SMALL_WORDS = new Set(['a', 'al', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'con', 'y', 'u']);

/** Abreviatura a partir del nombre: "Acceso a Datos" → "AD", "Historia del Arte" → "HA", "Historia" → "Historia". */
export function shortFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const main = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  if (main.length >= 2) return main.map((w) => w[0].toUpperCase()).join('').slice(0, 5);
  const one = words[0] ?? '';
  return one.length <= 10 ? one : one.slice(0, 8) + '.';
}

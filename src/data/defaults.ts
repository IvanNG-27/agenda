import type { State, Subject } from './types';

export const PALETTE: { token: string; name: string }[] = [
  { token: 'subj-azul', name: 'Azul' },
  { token: 'subj-turquesa', name: 'Turquesa' },
  { token: 'subj-violeta', name: 'Violeta' },
  { token: 'subj-rosa', name: 'Rosa' },
  { token: 'subj-ambar', name: 'Ámbar' },
  { token: 'subj-lavanda', name: 'Lavanda' },
  { token: 'subj-arena', name: 'Arena' },
  { token: 'subj-verde', name: 'Verde' },
  { token: 'subj-amarillo', name: 'Amarillo' },
];

/** Cada persona empieza sin asignaturas y añade las suyas en Ajustes. */
export const initialState = (): State => ({
  version: 1,
  userName: '',
  subjects: [],
  tasks: [],
  exams: [],
});

/** Primer color de la paleta que aún no usa ninguna asignatura (o el siguiente en rotación si están todos). */
export function nextColor(subjects: Subject[]): string {
  const used = new Set(subjects.map((s) => s.color));
  return (PALETTE.find((p) => !used.has(p.token)) ?? PALETTE[subjects.length % PALETTE.length]).token;
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

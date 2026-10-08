// Rachas de estudio: días seguidos en los que se ha marcado "He estudiado hoy".
import { addDays } from './dates';

/** Metas que se celebran al alcanzarlas */
export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

/** Días seguidos que acaban hoy (o ayer, si hoy aún no se ha estudiado: la racha sigue viva hasta medianoche). */
export function currentStreak(days: string[], today: string): number {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Racha más larga entre los días dados. */
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && addDays(sorted[i - 1], 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export type StreakInfo = {
  current: number;
  best: number;
  studiedToday: boolean;
  /** La racha actual supera a todas las anteriores */
  record: boolean;
  /** Mensaje de ánimo o felicitación */
  message: string;
  /** Siguiente objetivo: "Próxima meta: 7 días (te faltan 2)" */
  goal: string;
};

const plural = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

export function streakInfo(days: string[], today: string): StreakInfo {
  const current = currentStreak(days, today);
  const best = longestStreak(days);
  const studiedToday = days.includes(today);
  const start = addDays(studiedToday ? today : addDays(today, -1), -(current - 1));
  const bestBefore = longestStreak(days.filter((d) => d < start));
  const record = current > 1 && current > bestBefore;

  let message: string;
  if (current === 0) {
    message = best
      ? `Tu récord es de ${plural(best)}. Estudia hoy y empieza una racha nueva.`
      : 'Estudia hoy y márcalo en un examen para empezar tu racha.';
  } else if (!studiedToday) {
    message = `Llevas ${current === 1 ? '1 día' : `${current} días seguidos`}. Estudia hoy para no perder la racha.`;
  } else if (current === 1) {
    message = '¡Bien hecho! Primer día de racha. Mañana, a por el segundo.';
  } else if (record && current === bestBefore + 1 && bestBefore > 1) {
    message = `¡Nuevo récord! Has superado tu mejor racha: ${plural(current)} seguidos. 🏆`;
  } else if (current === 3) {
    message = '¡3 días seguidos! El hábito ya está en marcha.';
  } else if (current === 7) {
    message = '¡Una semana entera estudiando! Enhorabuena. 🎉';
  } else if (current === 14) {
    message = '¡Dos semanas sin fallar! Eres imparable.';
  } else if (current === 30) {
    message = '¡Un mes de racha! Esto ya es constancia de verdad. 🏅';
  } else if (MILESTONES.includes(current)) {
    message = `¡${plural(current)} seguidos! Enhorabuena. 🎉`;
  } else {
    message = `¡Genial! ${plural(current)} seguidos. Sigue así.`;
  }

  const next = MILESTONES.find((m) => m > current) ?? current + 1;
  const target = best > current && best + 1 < next ? best + 1 : next;
  const left = target - current;
  const goal =
    target === best + 1 && best > current
      ? `Te faltan ${plural(left)} para batir tu récord`
      : `Próxima meta: ${plural(target)} (te ${left === 1 ? 'falta' : 'faltan'} ${plural(left)})`;

  return { current, best, studiedToday, record, message, goal };
}

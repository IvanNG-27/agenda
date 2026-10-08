import type { Exam } from '../data/types';
import { actions } from '../data/store';
import { addDays, DOW_LETTER, weekday } from '../lib/dates';
import { streakInfo } from '../lib/streak';

/** Resumen de la racha de estudio: días seguidos, mejor racha, últimos 7 días y un mensaje de ánimo. */
export function StudyStreak({ studyLog, today }: { studyLog: string[]; today: string }) {
  const s = streakInfo(studyLog, today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const done = new Set(studyLog);

  return (
    <section className={`streak${s.studiedToday ? ' streak--done' : ''}`} aria-label="Racha de estudio">
      <div className="streak__head">
        <span className="streak__num" key={s.current}>
          <span className="streak__fire" aria-hidden="true">🔥</span>
          {s.current}
        </span>
        <span className="streak__label">
          {s.current === 1 ? 'día seguido' : 'días seguidos'}
          {s.record && <span className="streak__record">🏆 Récord</span>}
        </span>
        <span className="streak__best">
          Mejor racha
          <strong>{s.best} {s.best === 1 ? 'día' : 'días'}</strong>
        </span>
      </div>
      <ol className="streak__week" aria-label="Últimos 7 días">
        {week.map((d) => (
          <li
            key={d}
            className={`streak__day${done.has(d) ? ' is-done' : ''}${d === today ? ' is-today' : ''}`}
            aria-label={`${d}${done.has(d) ? ': estudiado' : ''}`}
          >
            {DOW_LETTER[weekday(d)]}
          </li>
        ))}
      </ol>
      <p className="streak__msg" key={s.message}>{s.message}</p>
      <p className="streak__goal">{s.goal}</p>
    </section>
  );
}

/** Botón "He estudiado hoy" de un examen. */
export function StudiedButton({ exam, today }: { exam: Exam; today: string }) {
  const on = !!exam.studyDays?.includes(today);
  return (
    <button
      type="button"
      className={`studied${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={() => actions.toggleStudied(exam.id, today)}
    >
      {on ? '✓ Estudiado hoy' : 'He estudiado hoy'}
    </button>
  );
}

import type { Exam } from '../data/types';
import { addDays, day, DOW_LETTER, monthName, startOfMonth, startOfWeek } from '../lib/dates';
import { navigate } from '../ui';
import { SectionHeader } from './Common';

/** Mini-calendario del mes (escritorio, panel derecho de "Hoy"). */
export function MiniCalendar({ today, exams }: { today: string; exams: Exam[] }) {
  const first = startOfMonth(today);
  const month = first.slice(0, 7);
  const start = startOfWeek(first);
  const examDays = new Set(exams.map((e) => e.date));
  const cells: string[] = [];
  for (let d = start; d.slice(0, 7) <= month || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);

  return (
    <section>
      <SectionHeader>{monthName(today)}</SectionHeader>
      <div className="mini">
        {DOW_LETTER.map((l) => (
          <span key={l} className="mini__dow">{l}</span>
        ))}
        {cells.map((d) => {
          const cls = [
            'mini__day',
            d === today && 'is-today',
            examDays.has(d) && 'has-exam',
            d.slice(0, 7) !== month && 'is-other',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={d}
              type="button"
              className={cls}
              onClick={() => navigate({ name: 'calendario', date: d })}
              aria-label={`${day(d)} de ${monthName(d)}${examDays.has(d) ? ', hay examen' : ''}`}
            >
              {day(d)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

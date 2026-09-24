import type { Exam, Subject } from '../data/types';
import { diffDays, DOW_LONG, DOW_SHORT, day, shortDate, weekday } from '../lib/dates';
import { SubjectChip } from './SubjectChip';
import { useUI } from '../ui';

type Props = {
  exam: Exam;
  subject?: Subject;
  today: string;
  /** Solo el examen más cercano */
  hot?: boolean;
  /** Carrusel móvil / franja de escritorio */
  compact?: boolean;
  /** Franja de escritorio: texto a la izquierda, número a la derecha */
  horizontal?: boolean;
  /** Etiqueta superior; por defecto "EXAMEN" */
  label?: string;
  chip?: boolean;
  /** Muestra el título dentro del texto de la cuenta atrás en lugar de en su propia línea */
  inlineTitle?: boolean;
  showDate?: boolean;
  bar?: boolean;
};

export function ExamCard({
  exam, subject, today, hot, compact, horizontal, label = 'Examen',
  chip = true, inlineTitle, showDate = true, bar = true,
}: Props) {
  const { openEditor } = useUI();
  const days = diffDays(today, exam.date);
  const past = days < 0;
  const number = days === 0 ? 'Hoy' : String(days);
  const unit = days === 0 ? '' : days === 1 ? 'día' : 'días';
  const caption = past
    ? `Fue el ${shortDate(exam.date)}`
    : inlineTitle
      ? [unit, exam.title, showDate ? `${DOW_SHORT[weekday(exam.date)].toLowerCase()} ${day(exam.date)}` : '']
          .filter(Boolean)
          .join(' · ')
      : [unit, showDate ? shortDate(exam.date) : '', showDate ? exam.time ?? '' : ''].filter(Boolean).join(' · ');

  const cls = ['exam', hot && 'exam--hot', compact && 'exam--compact', horizontal && 'exam--horizontal', past && 'exam--past']
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={cls} onClick={() => openEditor({ kind: 'exam', id: exam.id })}>
      <span className="exam__text">
        <span className="exam__top">
          <span className="exam__tag">{label}</span>
          {chip && subject && <SubjectChip subject={subject} />}
        </span>
        {!inlineTitle && <span className="exam__title">{exam.title}</span>}
        {!horizontal && (
          <span className="exam__count">
            {!past && <span className="exam__num">{number}</span>}
            <span className="exam__caption">{caption}</span>
          </span>
        )}
        {bar && !past && !horizontal && (
          <span className="prep" role="progressbar" aria-label="Repaso" aria-valuenow={exam.prep} aria-valuemin={0} aria-valuemax={100}>
            <span className="prep__fill" style={{ width: `${exam.prep}%` }} />
          </span>
        )}
      </span>
      {horizontal && !past && (
        <span className="exam__count">
          <span className="exam__num">{number}</span>
          <span className="exam__caption">{unit}</span>
        </span>
      )}
    </button>
  );
}

/** Variante de línea de tiempo (Móvil C): borde exam y "4d" en mono. */
export function ExamLine({ exam, subject, today }: { exam: Exam; subject?: Subject; today: string }) {
  const { openEditor } = useUI();
  const days = diffDays(today, exam.date);
  const when = [`${DOW_LONG[weekday(exam.date)]} ${day(exam.date)}`, exam.time].filter(Boolean).join(' · ');
  return (
    <button type="button" className="exam-line" onClick={() => openEditor({ kind: 'exam', id: exam.id })}>
      <span className="exam-line__text">
        <span className="exam-line__title">{[subject?.short, exam.title].filter(Boolean).join(' · ')}</span>
        <span className="exam-line__meta">{when}</span>
      </span>
      <span className="exam-line__num">{days === 0 ? 'Hoy' : `${days}d`}</span>
    </button>
  );
}

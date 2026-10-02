import type { AgendaEvent } from '../data/types';
import { relativeDate } from '../lib/dates';
import { eventColor, kindInfo, yearsOn } from '../lib/events';
import { useUI } from '../ui';

type Props = {
  event: AgendaEvent;
  /** Día en que ocurre (en los anuales, el de este año) */
  date: string;
  today: string;
  /** Listas de varios días: a la derecha la fecha; si no, la hora */
  withDate?: boolean;
};

/** Fila de un evento personal: mismo formato que una tarea, con el emoji del tipo en lugar de la casilla. */
export function EventItem({ event, date, today, withDate }: Props) {
  const { openEditor } = useUI();
  const info = kindInfo(event.kind);
  const years = yearsOn(event, date);
  const meta = [
    withDate && event.time,
    event.place,
    years && (event.kind === 'cumple' ? `cumple ${years}` : `${years} años`),
    !years && event.yearly && 'cada año',
    event.notes?.split('\n')[0],
  ].filter(Boolean).join(' · ');

  return (
    <div className="task task--event">
      <span className="task__bar" style={{ background: eventColor(event) }} />
      <span className="event-icon" role="img" aria-label={info.label}>
        {info.emoji}
      </span>
      <button type="button" className="task__main" onClick={() => openEditor({ kind: 'event', id: event.id })}>
        <span className="task__text">
          <span className="task__title">{event.title}</span>
          <span className="task__meta">{meta || info.label}</span>
        </span>
        <span className="task__date">{withDate ? relativeDate(date, today) : event.time ?? 'Todo el día'}</span>
      </button>
    </div>
  );
}

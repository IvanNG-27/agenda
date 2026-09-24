import type { DragEvent } from 'react';
import type { Subject, Task } from '../data/types';
import { actions } from '../data/store';
import { relativeDate } from '../lib/dates';
import { colorVar, isUrgent } from '../lib/rules';
import { Icon } from './Icons';
import { useUI } from '../ui';

type Props = {
  task: Task;
  subject?: Subject;
  today: string;
  /** Dentro de columnas kanban: fondo bg-200 */
  raised?: boolean;
  /** Texto extra tras la asignatura, p. ej. "para mañana" */
  extra?: string;
  draggable?: boolean;
};

export function TaskItem({ task, subject, today, raised, extra, draggable }: Props) {
  const { openEditor } = useUI();
  const urgent = isUrgent(task, today);
  const meta = [subject?.name, task.notes?.split('\n')[0], extra].filter(Boolean).join(' · ');

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`task${raised ? ' task--raised' : ''}${task.done ? ' task--done' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
    >
      <span className="task__bar" style={{ background: colorVar(subject) }} />
      <button
        type="button"
        className="checkbox"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Desmarcar ${task.title}` : `Marcar ${task.title} como hecha`}
        onClick={() => actions.toggleTask(task.id)}
      >
        {task.done && <Icon name="check" size={16} />}
      </button>
      <button type="button" className="task__main" onClick={() => openEditor({ kind: 'task', id: task.id })}>
        <span className="task__text">
          <span className="task__title">{task.title}</span>
          <span className="task__meta">{meta}</span>
        </span>
        <span className={`task__date${urgent ? ' is-urgent' : ''}`}>{relativeDate(task.dueDate, today)}</span>
      </button>
    </div>
  );
}

import type { Subject } from '../data/types';
import { colorVar } from '../lib/rules';

type Props = {
  subject?: Subject;
  /** Texto para el chip "Todas" */
  label?: string;
  solid?: boolean;
  full?: boolean;
  onClick?: () => void;
};

export function SubjectChip({ subject, label, solid, full, onClick }: Props) {
  const text = label ?? (full ? subject?.name : subject?.short) ?? '';
  const style = solid ? { background: subject ? colorVar(subject) : 'var(--accent)' } : undefined;
  const cls = `chip${solid ? ' chip--solid' : ''}`;
  const content = (
    <>
      {!solid && subject && <span className="dot" style={{ background: colorVar(subject) }} />}
      <span className="chip__text">{text}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick} aria-pressed={!!solid} title={subject?.name}>
        {content}
      </button>
    );
  }
  return (
    <span className={cls} style={style} title={subject?.name}>
      {content}
    </span>
  );
}

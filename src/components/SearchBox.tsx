import { useEffect, useMemo, useRef, useState } from 'react';
import type { State } from '../data/types';
import { relativeDate } from '../lib/dates';
import { colorVar, subjectMap } from '../lib/rules';
import { useUI } from '../ui';
import { Icon } from './Icons';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Buscador de escritorio (⌘K / Ctrl K) sobre tareas y exámenes. */
export function SearchBox({ state, today }: { state: State; today: string }) {
  const { openEditor } = useUI();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const subjects = subjectMap(state.subjects);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    const match = (...xs: (string | undefined)[]) => xs.some((x) => x && norm(x).includes(n));
    const tasks = state.tasks
      .filter((t) => match(t.title, t.notes, subjects.get(t.subjectId)?.name, subjects.get(t.subjectId)?.short))
      .map((t) => ({ kind: 'task' as const, id: t.id, title: t.title, subjectId: t.subjectId, date: t.dueDate, done: t.done }));
    const exams = state.exams
      .filter((e) => match(e.title, subjects.get(e.subjectId)?.name, subjects.get(e.subjectId)?.short))
      .map((e) => ({ kind: 'exam' as const, id: e.id, title: e.title, subjectId: e.subjectId, date: e.date, done: false }));
    return [...exams, ...tasks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [q, state, subjects]);

  const pick = (kind: 'task' | 'exam', id: string) => {
    setOpen(false);
    setQ('');
    input.current?.blur();
    openEditor({ kind, id });
  };

  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <Icon name="buscar" size={16} />
      <input
        ref={input}
        className="search__input"
        placeholder="Buscar tareas"
        aria-label="Buscar tareas y exámenes"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQ('');
            e.currentTarget.blur();
          }
          if (e.key === 'Enter' && results[0]) pick(results[0].kind, results[0].id);
        }}
      />
      <kbd className="kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      {open && q.trim() && (
        <div className="search__results">
          {results.length === 0 && <p className="search__none">Sin resultados</p>}
          {results.map((r) => {
            const s = subjects.get(r.subjectId);
            return (
              <button key={r.kind + r.id} type="button" className="search__item" onClick={() => pick(r.kind, r.id)}>
                <span className="dot" style={{ background: colorVar(s) }} />
                <span className={`search__title${r.done ? ' is-done' : ''}`}>{r.title}</span>
                <span className="search__meta">
                  {r.kind === 'exam' ? 'Examen · ' : ''}
                  {s?.short} · {relativeDate(r.date, today)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Note, NoteItem, State } from '../data/types';
import { actions } from '../data/store';
import { MAX_NOTE_ITEMS } from '../data/backup';
import { SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { Swatches } from '../components/ColorPicker';
import { colorCss, inkOn } from '../lib/rules';
import { useModal } from '../ui';

type Props = { state: State; desktop: boolean };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PREVIEW_ITEMS = 6;

/** Fijadas primero; dentro de cada grupo, la última editada arriba. */
const byPinnedThenRecent = (a: Note, b: Note) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt;

/** Apartado Notas: pósits con texto, listas con casillas, colores y notas fijadas. */
export function NotesView({ state, desktop }: Props) {
  const [open, setOpen] = useState<string | null>(null); // id de la nota abierta, o 'nueva'
  const [q, setQ] = useState('');
  const close = useCallback(() => setOpen(null), []);

  const n = norm(q.trim());
  const notes = [...state.notes]
    .filter((note) => !n || [note.title, note.text, ...(note.items ?? []).map((i) => i.text)].some((x) => x && norm(x).includes(n)))
    .sort(byPinnedThenRecent);
  const pinned = notes.filter((x) => x.pinned);
  const others = notes.filter((x) => !x.pinned);

  const grid = (list: Note[]) => (
    <div className="notes">
      {list.map((note) => (
        <NoteCard key={note.id} note={note} onOpen={() => setOpen(note.id)} />
      ))}
    </div>
  );

  return (
    <main className={desktop ? 'main' : 'page'}>
      <PageHeader title="Notas">
        {desktop && (
          <button type="button" className="btn" onClick={() => setOpen('nueva')}>
            + Nueva nota
          </button>
        )}
      </PageHeader>

      {state.notes.length > 0 && (
        <input
          className="input notes__search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en tus notas"
          aria-label="Buscar en tus notas"
        />
      )}

      {state.notes.length === 0 ? (
        <div className="notes__empty">
          <span className="notes__empty-icon" aria-hidden="true">🗒️</span>
          <p>Apunta aquí lo que quieras: ideas, listas, cosas que no quieres olvidar…</p>
          <button type="button" className="btn" onClick={() => setOpen('nueva')}>
            Escribir la primera nota
          </button>
        </div>
      ) : notes.length === 0 ? (
        <p className="empty">Ninguna nota contiene «{q.trim()}»</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <SectionHeader count={pinned.length}>Fijadas</SectionHeader>
              {grid(pinned)}
            </section>
          )}
          {others.length > 0 && (
            <section>
              {pinned.length > 0 && <SectionHeader count={others.length}>Otras</SectionHeader>}
              {grid(others)}
            </section>
          )}
        </>
      )}

      {!desktop && (
        <button type="button" className="fab" onClick={() => setOpen('nueva')} aria-label="Nueva nota">
          +
        </button>
      )}

      {open && (
        <NoteEditor
          key={open}
          note={open === 'nueva' ? undefined : state.notes.find((x) => x.id === open)}
          desktop={desktop}
          onClose={close}
        />
      )}
    </main>
  );
}

const edited = (t: number) => {
  if (!t) return '';
  const d = new Date(t);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? `Hoy, ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  const items = note.items ?? [];
  const style = note.color ? { background: colorCss(note.color), color: inkOn(note.color) } : undefined;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <article
      className={`note-card${note.color ? ' note-card--color' : ''}`}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Abrir nota ${note.title ?? ''}`.trim()}
      onClick={onOpen}
      onKeyDown={onKey}
    >
      {(note.title || note.pinned) && (
        <h3 className="note-card__title">
          {note.pinned && <span className="note-card__pin" aria-label="Fijada">📌 </span>}
          {note.title}
        </h3>
      )}
      {note.text && <p className="note-card__text">{note.text}</p>}
      {items.length > 0 && (
        <ul className="note-card__items">
          {items.slice(0, PREVIEW_ITEMS).map((it, i) => (
            <li key={i} className={it.done ? 'is-done' : undefined}>
              <button
                type="button"
                className="note-check"
                role="checkbox"
                aria-checked={it.done}
                aria-label={it.done ? `Desmarcar ${it.text}` : `Marcar ${it.text}`}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.toggleNoteItem(note.id, i);
                }}
              >
                {it.done && <Icon name="check" size={12} />}
              </button>
              <span>{it.text}</span>
            </li>
          ))}
          {items.length > PREVIEW_ITEMS && <li className="note-card__more">+{items.length - PREVIEW_ITEMS} más</li>}
        </ul>
      )}
      <p className="note-card__date">{edited(note.updatedAt)}</p>
    </article>
  );
}

/** Crear o editar una nota. Hoja inferior en móvil, diálogo en escritorio. */
function NoteEditor({ note, desktop, onClose }: { note?: Note; desktop: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [text, setText] = useState(note?.text ?? '');
  const [items, setItems] = useState<NoteItem[]>(note?.items ?? []);
  const [color, setColor] = useState(note?.color ?? '');
  const [pinned, setPinned] = useState(!!note?.pinned);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [focusItem, setFocusItem] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);

  useModal(dialogRef, onClose);
  useEffect(() => {
    if (!note) titleRef.current?.focus();
  }, [note]);
  useEffect(() => {
    if (focusItem !== null) itemRefs.current[focusItem]?.focus();
  }, [focusItem, items.length]);

  const addItem = (at = items.length) => {
    if (items.length >= MAX_NOTE_ITEMS) return;
    setItems([...items.slice(0, at), { text: '', done: false }, ...items.slice(at)]);
    setFocusItem(at);
  };
  const setItem = (i: number, patch: Partial<NoteItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => {
    setItems(items.filter((_, j) => j !== i));
    setFocusItem(i > 0 ? i - 1 : null);
  };

  const clean = {
    title: title.trim() || undefined,
    text: text.trim() || undefined,
    items: items.map((it) => ({ ...it, text: it.text.trim() })).filter((it) => it.text),
    color: color || undefined,
    pinned: pinned || undefined,
  };
  const empty = !clean.title && !clean.text && !clean.items.length;

  const save = () => {
    const data = { ...clean, items: clean.items.length ? clean.items : undefined };
    if (note) {
      if (empty) actions.deleteNote(note.id); // vaciarla del todo es como borrarla
      else actions.updateNote(note.id, data);
    } else if (!empty) {
      actions.addNote(data);
    }
    onClose();
  };

  const remove = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (note) actions.deleteNote(note.id);
    onClose();
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={`${desktop ? 'dialog' : 'sheet'} note-editor`}
        style={color ? { borderTopColor: colorCss(color) } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nota-title"
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="form__head">
            <h2 id="nota-title" className="form__title">{note ? 'Editar nota' : 'Nueva nota'}</h2>
            <button
              type="button"
              className={`icon-btn note-editor__pin${pinned ? ' is-active' : ''}`}
              aria-pressed={pinned}
              aria-label={pinned ? 'Quitar de fijadas' : 'Fijar arriba'}
              title={pinned ? 'Quitar de fijadas' : 'Fijar arriba'}
              onClick={() => setPinned(!pinned)}
            >
              📌
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="cerrar" size={18} />
            </button>
          </div>

          <input
            ref={titleRef}
            className="input note-editor__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            aria-label="Título"
            maxLength={120}
          />
          <textarea
            className="input textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe lo que quieras…"
            aria-label="Texto de la nota"
            rows={5}
            maxLength={5000}
          />

          <fieldset className="field">
            <legend className="field__label">Lista</legend>
            {items.length > 0 && (
              <ul className="note-editor__items">
                {items.map((it, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="checkbox"
                      role="checkbox"
                      aria-checked={it.done}
                      aria-label={it.done ? 'Desmarcar' : 'Marcar como hecho'}
                      onClick={() => setItem(i, { done: !it.done })}
                    >
                      {it.done && <Icon name="check" size={16} />}
                    </button>
                    <input
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      className={`input${it.done ? ' is-done' : ''}`}
                      value={it.text}
                      onChange={(e) => setItem(i, { text: e.target.value })}
                      onKeyDown={(e) => {
                        // Enter añade el siguiente punto; borrar en un punto vacío lo quita
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItem(i + 1);
                        } else if (e.key === 'Backspace' && it.text === '') {
                          e.preventDefault();
                          removeItem(i);
                        }
                      }}
                      placeholder="Punto de la lista"
                      aria-label={`Punto ${i + 1}`}
                      maxLength={300}
                    />
                    <button type="button" className="icon-btn icon-btn--sm" aria-label="Quitar punto" onClick={() => removeItem(i)}>
                      <Icon name="cerrar" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {items.length < MAX_NOTE_ITEMS && (
              <button type="button" className="add-dashed" onClick={() => addItem()}>
                + Añadir punto
              </button>
            )}
          </fieldset>

          <fieldset className="field">
            <legend className="field__label">Color</legend>
            <Swatches label="Color de la nota" value={color} onChange={setColor} allowNone />
          </fieldset>

          <div className="form__actions">
            {note && (
              <button type="button" className={`btn btn--secondary${confirmDelete ? ' btn--danger' : ''}`} onClick={remove}>
                {confirmDelete ? 'Toca otra vez para borrar' : 'Borrar'}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={!note && empty}>
              {note ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

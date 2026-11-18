// Historial de una tarea, un examen o una nota de un grupo (como el de GitHub): quién lo creó, qué se ha ido
// cambiando (antes → después) y los comentarios, todo en una línea de tiempo. Solo se carga mientras está abierto.
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Activity, Author, Change, Group } from '../data/types';
import { activity as api, type ActivityKind } from '../sync';
import { FIELD_LABEL } from '../lib/activity';
import { colorCss } from '../lib/rules';

const NOUN: Record<ActivityKind, { the: string; made: string }> = {
  tasks: { the: 'la tarea', made: 'Creada' },
  exams: { the: 'el examen', made: 'Creado' },
  notes: { the: 'la nota', made: 'Creada' },
};

const AVATAR = ['subj-coral', 'subj-turquesa', 'subj-lavanda', 'subj-ambar', 'subj-rosa', 'subj-cielo', 'subj-lima', 'subj-violeta'];

function Avatar({ who }: { who: Author }) {
  let h = 0;
  for (const ch of who.uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const words = who.name.trim().split(/\s+/);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : who.name.slice(0, 2)).toUpperCase();
  return (
    <span className="act-avatar" style={{ background: colorCss(AVATAR[h % AVATAR.length]) }} aria-hidden="true">
      {initials}
    </span>
  );
}

/** "ahora mismo", "hace 5 min", "hace 3 h", "ayer", "hace 4 días" o la fecha. */
function ago(ms: number, now: number): string {
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return 'ahora mismo';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const d = new Date(ms);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}
const full = (ms: number) => new Date(ms).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

function Swatch({ color }: { color: string }) {
  return color ? <span className="act-swatch" style={{ background: colorCss(color) }} /> : <span className="act-none">sin color</span>;
}

/** Un cambio, en palabras: "cambió la fecha: vie 20 nov → lun 23 nov". */
function ChangeLine({ c }: { c: Change }) {
  const label = FIELD_LABEL[c.f] ?? c.f;
  if (c.f === 'items') return <>actualizó la lista: <span className="act-ins">{c.to}</span></>;
  if (c.f === 'pinned') return <>{c.to === 'sí' ? 'la fijó arriba' : 'la quitó de fijadas'}</>;
  if (c.f === 'color')
    return (
      <>
        cambió el color: <Swatch color={c.from} /> → <Swatch color={c.to} />
      </>
    );
  if (!c.from) return <>añadió {label}: <span className="act-ins">{c.to}</span></>;
  if (!c.to) return <>quitó {label}: <span className="act-del">{c.from}</span></>;
  return (
    <>
      cambió {label}: <span className="act-del">{c.from}</span> → <span className="act-ins">{c.to}</span>
    </>
  );
}

type Item = { id: string; group?: string; by?: Author };

export function ItemActivity({ kind, item, group }: { kind: ActivityKind; item: Item; group?: Group }) {
  const [list, setList] = useState<Activity[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const gid = item.group;

  useEffect(() => {
    if (!gid) return;
    return api.watch(gid, kind, item.id, (l, m) => {
      setList(l);
      setMe(m);
    });
  }, [gid, kind, item.id]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!gid || !group) return null;
  const owner = group.role === 'owner';
  const noun = NOUN[kind];
  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo hacer.');
    }
  };
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setDraft(''); // aparece al momento en la lista (se sube por detrás)
    void run(() => api.comment(gid, kind, item.id, t));
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
  };
  const created = list?.find((a) => a.type === 'create');
  const creator: Author | undefined = item.by ?? (created ? { uid: created.uid, name: created.name } : undefined);
  const who = (a: Author) => (a.uid === me ? 'Tú' : a.name);
  const comments = list?.filter((a) => a.type === 'comment').length ?? 0;

  return (
    <section className="act" aria-label="Actividad">
      <h3 className="act__title">
        Actividad
        {comments > 0 && <span className="act__count">{comments === 1 ? '1 comentario' : `${comments} comentarios`}</span>}
      </h3>

      {creator ? (
        <p className="act__by">
          <Avatar who={creator} />
          <span>
            {noun.made} por <strong>{creator.uid === me ? 'ti' : creator.name}</strong>
            {created && (
              <>
                {' · '}
                <time dateTime={new Date(created.at).toISOString()} title={full(created.at)}>
                  {ago(created.at, now)}
                </time>
              </>
            )}
          </span>
        </p>
      ) : (
        list && <p className="act__by act__by--old">Se creó antes de que hubiera historial.</p>
      )}

      {list === null ? (
        <p className="act__empty">Cargando la actividad…</p>
      ) : (
        <ol className="act__list">
          {list
            .filter((a) => a.type !== 'create')
            .map((a) =>
              a.type === 'edit' ? (
                <li key={a.id} className="act-event">
                  <span className="act-event__dot" aria-hidden="true">✎</span>
                  <div className="act-event__body">
                    <p className="act-event__head">
                      <strong>{who(a)}</strong> {a.uid === me ? 'editaste' : 'editó'} {noun.the}
                      <time className="act-time" title={full(a.at)}>
                        {ago(a.at, now)}
                      </time>
                    </p>
                    <ul className="act-changes">
                      {(a.changes ?? []).map((c, i) => (
                        <li key={i}>
                          <ChangeLine c={c} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : (
                <li key={a.id} className="act-comment">
                  <Avatar who={a} />
                  <div className="act-comment__box">
                    <p className="act-comment__head">
                      <strong>{who(a)}</strong>
                      <time className="act-time" title={full(a.at)}>
                        {ago(a.at, now)}
                      </time>
                      {a.edited && <span className="act-edited" title={`Editado el ${full(a.edited)}`}>· editado</span>}
                    </p>
                    {editing === a.id ? (
                      <form
                        className="act-edit"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const t = editText.trim();
                          if (!t) return;
                          setEditing(null);
                          void run(() => api.edit(gid, kind, item.id, a.id, t));
                        }}
                      >
                        <textarea
                          className="input textarea"
                          value={editText}
                          maxLength={1000}
                          rows={2}
                          autoFocus
                          aria-label="Editar comentario"
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <div className="act-actions">
                          <button type="submit" className="btn btn--sm" disabled={!editText.trim()}>
                            Guardar
                          </button>
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditing(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="act-comment__text">{a.text}</p>
                    )}
                    {editing !== a.id && (a.uid === me || owner) && (
                      <div className="act-actions">
                        {a.uid === me && (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => {
                              setEditing(a.id);
                              setEditText(a.text ?? '');
                            }}
                          >
                            Editar
                          </button>
                        )}
                        {confirm === a.id ? (
                          <button
                            type="button"
                            className="text-btn text-btn--danger"
                            onClick={() => {
                              setConfirm(null);
                              void run(() => api.remove(gid, kind, item.id, a.id));
                            }}
                          >
                            ¿Borrar? Toca otra vez
                          </button>
                        ) : (
                          <button type="button" className="text-btn" onClick={() => setConfirm(a.id)}>
                            Borrar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ),
            )}
        </ol>
      )}

      <form className="act-compose" onSubmit={send}>
        <textarea
          className="input textarea"
          value={draft}
          maxLength={1000}
          rows={2}
          placeholder="Escribe un comentario…"
          aria-label="Escribe un comentario"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="act-actions">
          <span className="act-hint">Lo verá todo el grupo · Ctrl + Enter para enviar</span>
          <button type="submit" className="btn btn--sm" disabled={!draft.trim()}>
            Comentar
          </button>
        </div>
      </form>
      {error && (
        <p className="backup__text backup__text--error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

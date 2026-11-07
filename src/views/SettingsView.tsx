import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Group, State } from '../data/types';
import { actions, canEdit, personalOnly } from '../data/store';
import { downloadBackup, MAX_BACKUP_BYTES, parseBackup } from '../data/backup';
import { nextColor, shortFrom } from '../data/defaults';
import type { Subject } from '../data/types';
import { SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { href } from '../ui';
import { Swatches } from '../components/ColorPicker';
import { colorCss } from '../lib/rules';
import { deleteAccount, groups as groupApi, signIn, signOut, useSync, type SyncStatus } from '../sync';
import { isDesktopApp } from '../sync/config';
import { releasesBetween } from '../data/changelog';
import { WhatsNew } from '../components/WhatsNew';
import { useUpdate } from '../updates';
import { enableNotifications, testNotification, upgradeToPush, useNotify } from '../notify';
import { useToday } from '../data/store';
import { setHalloweenOff, useHalloween } from '../lib/season';

type Props = { state: State; desktop: boolean };

export function SettingsView({ state, desktop }: Props) {
  return (
    <main className={desktop ? 'main main--narrow' : 'page'}>
      {!desktop && (
        <a className="back" href={href({ name: 'tablero' })}>
          <Icon name="izq" size={16} />
          Tablero
        </a>
      )}
      <PageHeader title="Ajustes" />

      <SyncSection state={state} />

      <NotificationsSection />

      <HalloweenSection />

      <section>
        <SectionHeader>Tu nombre</SectionHeader>
        <input
          className="input"
          value={state.userName}
          onChange={(e) => actions.setUserName(e.target.value)}
          aria-label="Tu nombre"
          placeholder="Cómo quieres que te salude la app"
          maxLength={40}
        />
      </section>

      <SubjectsSection state={state} />

      <GroupsSection state={state} />

      <BackupSection state={state} />

      <AppVersion />
    </main>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 tareas, 1 examen, 2 eventos y 4 notas" */
const summary = (s: State) =>
  `${plural(s.tasks.length, 'tarea', 'tareas')}, ${plural(s.exams.length, 'examen', 'exámenes')}, ${plural(s.events.length, 'evento', 'eventos')} y ${plural(s.notes.length, 'nota', 'notas')}`;

/** Asignaturas personales o, con `group`, las de un grupo (dentro de su tarjeta en Grupos). */
function SubjectsSection({ state, group }: { state: State; group?: Group }) {
  const [adding, setAdding] = useState(false);
  const subjects = state.subjects.filter((s) => s.group === group?.id);
  const list = (
    <div className="list">
      {subjects.length === 0 && !adding && (
        <p className="backup__text">
          {group
            ? 'Este grupo aún no tiene asignaturas.'
            : 'Aún no tienes asignaturas. Añade las tuyas para empezar a apuntar deberes y exámenes.'}
        </p>
      )}
      {subjects.map((s) => (
        <SubjectEditor key={s.id} subject={s} state={state} />
      ))}
      {adding ? (
        <NewSubject subjects={subjects} group={group?.id} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="add-dashed" onClick={() => setAdding(true)}>
          + Añadir asignatura
        </button>
      )}
    </div>
  );
  if (group) return list;
  return (
    <section>
      <SectionHeader>Asignaturas</SectionHeader>
      {list}
    </section>
  );
}

const ROLE_LABEL = { owner: 'Administras', editor: 'Puedes editar', viewer: 'Solo lectura' } as const;
const formatCode = (c: string) => `${c.slice(0, 5)}-${c.slice(5)}`;

/** Calendarios compartidos: solo en la web, con la sesión iniciada. */
function GroupsSection({ state }: { state: State }) {
  const sync = useSync();
  if (isDesktopApp || sync.phase === 'unconfigured') return null;
  return (
    <section>
      <SectionHeader>Grupos</SectionHeader>
      {!signedIn(sync) ? (
        <div className="backup">
          <p className="backup__text">
            Comparte un calendario con tu clase, tu familia o tus amigos: asignaturas, tareas, exámenes, eventos y notas.
            Inicia sesión con Google (arriba) para crear un grupo o unirte a uno.
          </p>
        </div>
      ) : (
        <div className="list">
          {state.groups.map((g) => (
            <GroupCard key={g.id} group={g} state={state} />
          ))}
          <NewGroup />
        </div>
      )}
    </section>
  );
}

/** Ejecuta una acción de grupo mostrando "trabajando" y el error si lo hay. */
function useGroupAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo hacer.');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function NewGroup() {
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [name, setName] = useState('');
  const [color, setColor] = useState('subj-turquesa');
  const [code, setCode] = useState('');
  const { busy, error, run } = useGroupAction();

  if (mode === 'none') {
    return (
      <div className="group-new">
        <button type="button" className="add-dashed" onClick={() => setMode('create')}>
          + Crear un grupo
        </button>
        <button type="button" className="add-dashed" onClick={() => setMode('join')}>
          Unirme con un código
        </button>
      </div>
    );
  }
  const done = () => {
    setMode('none');
    setName('');
    setCode('');
  };
  return mode === 'create' ? (
    <form
      className="subject-edit subject-edit--new"
      aria-label="Nuevo grupo"
      onSubmit={async (e) => {
        e.preventDefault();
        if (name.trim() && (await run(() => groupApi.create(name, color)))) done();
      }}
    >
      <label className="field">
        <span className="field__label">Nombre del grupo</span>
        <input className="input" value={name} maxLength={60} autoFocus placeholder="2º DAM, Familia, Piso…" onChange={(e) => setName(e.target.value)} />
      </label>
      <Swatches label="Color del grupo" value={color} onChange={setColor} />
      <p className="backup__text">Lo administrarás tú: invitas a gente con un código y decides quién puede editar.</p>
      {error && <p className="backup__text backup__text--error" role="alert">{error}</p>}
      <div className="backup__actions">
        <button type="submit" className="btn" disabled={!name.trim() || busy}>
          {busy ? 'Creando…' : 'Crear grupo'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={done}>
          Cancelar
        </button>
      </div>
    </form>
  ) : (
    <form
      className="subject-edit subject-edit--new"
      aria-label="Unirme a un grupo"
      onSubmit={async (e) => {
        e.preventDefault();
        if (code.trim() && (await run(() => groupApi.join(code)))) done();
      }}
    >
      <label className="field">
        <span className="field__label">Código de invitación</span>
        <input
          className="input group-code-input"
          value={code}
          maxLength={11}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABCDE-23456"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <p className="backup__text">Entrarás como lector: verás todo lo del grupo y quien lo administra puede darte permiso para editar.</p>
      {error && <p className="backup__text backup__text--error" role="alert">{error}</p>}
      <div className="backup__actions">
        <button type="submit" className="btn" disabled={!code.trim() || busy}>
          {busy ? 'Entrando…' : 'Unirme'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={done}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function GroupCard({ group: g, state }: { group: Group; state: State }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(g.name);
  const [confirm, setConfirm] = useState<string | null>(null); // 'salir' | 'borrar' | uid a quitar
  const [copied, setCopied] = useState(false);
  const { busy, error, run } = useGroupAction();
  const owner = g.role === 'owner';

  const copy = async () => {
    if (!g.invite) return;
    try {
      await navigator.clipboard.writeText(formatCode(g.invite.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sin portapapeles: el código se puede seleccionar a mano */
    }
  };

  return (
    <div className="group-card">
      <button type="button" className="group-card__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="dot dot--10" style={{ background: colorCss(g.color) }} />
        <span className="group-card__name">{g.name}</span>
        <span className={`group-role group-role--${g.role}`}>{ROLE_LABEL[g.role]}</span>
        <span className="group-card__count">{plural(g.members.length, 'miembro', 'miembros')}</span>
        <Icon name={open ? 'izq' : 'der'} size={14} />
      </button>

      {open && (
        <div className="group-card__body">
          {owner && (
            <div className="group-card__block">
              <label className="field">
                <span className="field__label">Nombre</span>
                <input
                  className="input"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => name.trim() && name.trim() !== g.name && run(() => groupApi.rename(g.id, name, g.color))}
                />
              </label>
              <Swatches label={`Color de ${g.name}`} value={g.color} onChange={(color) => run(() => groupApi.rename(g.id, g.name, color))} />
            </div>
          )}

          {owner && (
            <div className="group-card__block">
              <h3 className="group-card__title">Invitar</h3>
              {g.invite ? (
                <>
                  <div className="group-invite">
                    <code className="group-invite__code">{formatCode(g.invite.code)}</code>
                    <button type="button" className="btn btn--secondary" onClick={copy}>
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="backup__text">
                    Válido hasta el {new Date(g.invite.expires).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}. Quien lo use
                    entra como lector.{' '}
                    <button type="button" className="inline-link link-btn" onClick={() => run(() => groupApi.invite(g.id))} disabled={busy}>
                      Crear otro (el actual deja de servir)
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="backup__text">Crea un código y pásaselo a quien quieras invitar. Sirve durante 7 días.</p>
                  <div className="backup__actions">
                    <button type="button" className="btn btn--secondary" onClick={() => run(() => groupApi.invite(g.id))} disabled={busy}>
                      Crear código de invitación
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="group-card__block">
            <h3 className="group-card__title">Miembros</h3>
            <ul className="group-members">
              {[...g.members]
                .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name)))
                .map((m) => (
                  <li key={m.uid}>
                    <span className="group-members__name">{m.name}</span>
                    {m.role === 'owner' ? (
                      <span className="group-role group-role--owner">Administra</span>
                    ) : owner ? (
                      <>
                        <label className="check-row group-members__perm">
                          <button
                            type="button"
                            className="checkbox"
                            role="checkbox"
                            aria-checked={m.role === 'editor'}
                            aria-label={`${m.name} puede editar`}
                            disabled={busy}
                            onClick={() => run(() => groupApi.setRole(g.id, m.uid, m.role === 'editor' ? 'viewer' : 'editor'))}
                          >
                            {m.role === 'editor' && <Icon name="check" size={16} />}
                          </button>
                          <span>Puede editar</span>
                        </label>
                        {confirm === m.uid ? (
                          <button type="button" className="text-btn text-btn--danger" onClick={() => run(() => groupApi.remove(g.id, m.uid))}>
                            ¿Quitar? Toca otra vez
                          </button>
                        ) : (
                          <button type="button" className="text-btn" onClick={() => setConfirm(m.uid)}>
                            Quitar
                          </button>
                        )}
                      </>
                    ) : (
                      <span className={`group-role group-role--${m.role}`}>{m.role === 'editor' ? 'Edita' : 'Lector'}</span>
                    )}
                  </li>
                ))}
            </ul>
          </div>

          <div className="group-card__block">
            <h3 className="group-card__title">Asignaturas del grupo</h3>
            {canEdit({ group: g.id }, state) ? (
              <SubjectsSection state={state} group={g} />
            ) : (
              <p className="backup__text">
                {state.subjects.filter((x) => x.group === g.id).map((x) => x.name).join(', ') || 'Este grupo aún no tiene asignaturas.'}
              </p>
            )}
          </div>

          {error && <p className="backup__text backup__text--error" role="alert">{error}</p>}

          <div className="backup__actions">
            {owner ? (
              confirm === 'borrar' ? (
                <>
                  <button type="button" className="btn btn--danger btn--secondary" disabled={busy} onClick={() => run(() => groupApi.delete(g.id))}>
                    {busy ? 'Borrando…' : 'Borrar el grupo y todo lo suyo'}
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => setConfirm(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button type="button" className="text-btn" onClick={() => setConfirm('borrar')}>
                  Borrar grupo
                </button>
              )
            ) : confirm === 'salir' ? (
              <>
                <button type="button" className="btn btn--danger btn--secondary" disabled={busy} onClick={() => run(() => groupApi.leave(g.id))}>
                  Salir del grupo
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => setConfirm(null)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button type="button" className="text-btn" onClick={() => setConfirm('salir')}>
                Salir del grupo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectEditor({ subject: s, state }: { subject: Subject; state: State }) {
  const [confirming, setConfirming] = useState(false);
  const tasks = state.tasks.filter((t) => t.subjectId === s.id).length;
  const exams = state.exams.filter((e) => e.subjectId === s.id).length;
  const lost =
    tasks + exams === 0
      ? 'No tiene tareas ni exámenes.'
      : `También se borrarán ${[tasks && plural(tasks, 'tarea', 'tareas'), exams && plural(exams, 'examen', 'exámenes')].filter(Boolean).join(' y ')}.`;

  return (
    <div className="subject-edit">
      <div className="subject-edit__fields">
        <label className="field">
          <span className="field__label">Nombre</span>
          <input className="input" value={s.name} maxLength={60} onChange={(e) => actions.updateSubject(s.id, { name: e.target.value })} />
        </label>
        <label className="field field--short">
          <span className="field__label">Corto</span>
          <input className="input" value={s.short} maxLength={12} onChange={(e) => actions.updateSubject(s.id, { short: e.target.value })} />
        </label>
      </div>
      {confirming ? (
        <div className="backup__confirm" role="alert">
          <p className="backup__text backup__text--ink">
            ¿Eliminar {s.name || 'esta asignatura'}? {lost}
          </p>
          <div className="backup__actions">
            <button type="button" className="btn btn--secondary btn--danger" onClick={() => actions.deleteSubject(s.id)}>
              Eliminar asignatura
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="subject-edit__row">
          <Swatches label={`Color de ${s.name}`} value={s.color} onChange={(color) => actions.updateSubject(s.id, { color })} />
          <button type="button" className="text-btn" onClick={() => setConfirming(true)}>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function NewSubject({ subjects, group, onDone }: { subjects: Subject[]; group?: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [color, setColor] = useState(() => nextColor(subjects));
  const auto = shortFrom(name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    actions.addSubject({ name: n, short: short.trim() || auto || n.slice(0, 12), color, group });
    onDone();
  };

  return (
    <form className="subject-edit subject-edit--new" onSubmit={submit} aria-label="Nueva asignatura">
      <div className="subject-edit__fields">
        <label className="field">
          <span className="field__label">Nombre</span>
          <input className="input" value={name} maxLength={60} autoFocus placeholder="Matemáticas" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field field--short">
          <span className="field__label">Corto</span>
          <input className="input" value={short} maxLength={12} placeholder={auto || 'Mates'} onChange={(e) => setShort(e.target.value)} />
        </label>
      </div>
      <Swatches label="Color de la nueva asignatura" value={color} onChange={setColor} />
      <div className="backup__actions">
        <button type="submit" className="btn" disabled={!name.trim()}>
          Añadir
        </button>
        <button type="button" className="btn btn--secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function BackupSection({ state }: { state: State }) {
  const sync = useSync();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<State | null>(null);
  const [message, setMessage] = useState('');

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('La copia es demasiado grande (máximo 5 MB).');
      setPending(parseBackup(await file.text()));
      setMessage('');
    } catch (err) {
      setPending(null);
      setMessage(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  };

  const confirm = () => {
    if (!pending) return;
    actions.replaceAll(pending);
    setMessage(`Copia importada: ${summary(pending)}.`);
    setPending(null);
  };

  return (
    <section>
      <SectionHeader>Copia de seguridad</SectionHeader>
      <div className="backup">
        <p className="backup__text">
          {signedIn(sync)
            ? 'Tus datos están en tu cuenta. Exporta una copia si quieres guardarlos también en un archivo.'
            : 'Tus datos se guardan solo en este dispositivo. Exporta una copia para guardarla o para pasarla a otro dispositivo.'}
        </p>
        {pending ? (
          <div className="backup__confirm" role="alert">
            <p className="backup__text backup__text--ink">
              La copia tiene {summary(pending)}. Si la importas, reemplaza lo que tienes ahora ({summary(personalOnly(state))}).
            </p>
            <div className="backup__actions">
              <button type="button" className="btn" onClick={confirm}>
                Reemplazar mis datos
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setPending(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="backup__actions">
            <button type="button" className="btn btn--secondary" onClick={() => downloadBackup(state)}>
              Exportar copia
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
              Importar copia
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
          </div>
        )}
        {message && (
          <p className="backup__text" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}

const signedIn = (s: SyncStatus) => ['synced', 'pending', 'offline', 'starting'].includes(s.phase) && !!s.email;

const STATUS_TEXT: Partial<Record<SyncStatus['phase'], string>> = {
  starting: 'Conectando…',
  synced: 'Todo sincronizado.',
  pending: 'Guardando cambios…',
  offline: 'Sin conexión. Lo que cambies se subirá al volver.',
};

/** Solo aparece durante la semana de Halloween: permite quitar (o volver a poner) la decoración ese año. */
function HalloweenSection() {
  const today = useToday();
  const season = useHalloween(today);
  if (season === 'none') return null;
  const year = today.slice(0, 4);
  return (
    <section>
      <SectionHeader>Halloween 🎃</SectionHeader>
      <div className="backup">
        <p className="backup__text">
          {season === 'on'
            ? 'Hasta el 1 de noviembre, Nocta se disfraza: arañas, calabazas, fantasmas y algo de sangre. El 2 vuelve a ser la de siempre.'
            : 'Has quitado la decoración de Halloween de este año. Vuelve sola el próximo.'}
        </p>
        <div className="backup__actions">
          <button type="button" className="btn btn--secondary" onClick={() => setHalloweenOff(year, season === 'on')}>
            {season === 'on' ? 'Quitar la decoración este año' : 'Volver a ponerla'}
          </button>
        </div>
      </div>
    </section>
  );
}

function NotificationsSection() {
  const notify = useNotify();
  const sync = useSync();
  const signedInNow = signedIn(sync);
  const [atLogin, setAtLogin] = useState<boolean | null>(null);

  // Al iniciar sesión con el permiso ya concedido, se intenta pasar a avisos con la app cerrada
  useEffect(() => {
    if (signedInNow && notify.state === 'local') void upgradeToPush();
  }, [signedInNow, notify.state]);

  useEffect(() => {
    void window.noctaDesktop?.getOpenAtLogin().then(setAtLogin);
  }, []);

  const toggleAtLogin = async () => {
    if (!window.noctaDesktop) return;
    setAtLogin(await window.noctaDesktop.setOpenAtLogin(!atLogin));
  };

  let text: string;
  if (isDesktopApp) {
    text =
      'Los recordatorios te avisan con notificaciones de Windows. Al cerrar la ventana, Nocta sigue junto al reloj para poder avisarte; para salir del todo, usa su icono.';
  } else if (notify.state === 'push') {
    text = 'Activadas: los recordatorios te llegarán aunque Nocta esté cerrada.';
  } else if (notify.state === 'local') {
    text = notify.note ?? 'Activadas mientras Nocta esté abierta.';
  } else if (notify.state === 'blocked') {
    text = 'Están bloqueadas en este navegador. Actívalas en la configuración del sitio (el candado junto a la dirección).';
  } else if (notify.state === 'unsupported') {
    text = 'Este navegador no puede mostrar notificaciones.';
  } else {
    text = 'Elige un recordatorio al añadir una tarea, un examen o un evento, y Nocta te avisará con una notificación.';
  }

  return (
    <section>
      <SectionHeader>Notificaciones</SectionHeader>
      <div className="backup">
        <p className="backup__text">{text}</p>
        <div className="backup__actions">
          {notify.state === 'off' && (
            <button type="button" className="btn" onClick={() => void enableNotifications()}>
              Activar notificaciones
            </button>
          )}
          {(notify.state === 'local' || notify.state === 'push') && (
            <button type="button" className="btn btn--secondary" onClick={testNotification}>
              Probar
            </button>
          )}
        </div>
        {isDesktopApp && atLogin !== null && (
          <label className="check-row">
            <button type="button" className="checkbox" role="checkbox" aria-checked={atLogin} onClick={() => void toggleAtLogin()}>
              {atLogin && <Icon name="check" size={16} />}
            </button>
            <span>Abrir Nocta al iniciar Windows (para que avise aunque no la abras)</span>
          </label>
        )}
      </div>
    </section>
  );
}

function SyncSection({ state }: { state: State }) {
  const sync = useSync();
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (sync.phase === 'unconfigured') return null;

  let body;
  if (sync.phase === 'desktop') {
    body = (
      <p className="backup__text">
        La sincronización funciona en la versión web. Instálala desde el navegador para tener tus datos en el móvil y en el
        portátil.
      </p>
    );
  } else if (signedIn(sync)) {
    body = (
      <>
        <p className="backup__text backup__text--ink">Conectado como {sync.email}</p>
        <p className="backup__text" role="status">
          <span className={`sync-dot sync-dot--${sync.phase}`} aria-hidden="true" />
          {STATUS_TEXT[sync.phase]}
        </p>
        {confirmOut ? (
          <div className="backup__confirm" role="alert">
            <p className="backup__text backup__text--ink">
              Al cerrar sesión se borra tu agenda de este dispositivo. Sigue guardada en tu cuenta y vuelve al iniciar sesión.
              {(sync.phase === 'pending' || sync.phase === 'offline') &&
                ' Ojo: hay cambios que aún no se han subido y se perderán.'}
            </p>
            <div className="backup__actions">
              <button type="button" className="btn" onClick={() => signOut()}>
                Cerrar sesión y borrar de este dispositivo
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmOut(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : confirmDelete ? (
          <div className="backup__confirm" role="alert">
            <p className="backup__text backup__text--ink">
              Se borrarán para siempre tu cuenta de Nocta y todo lo que tienes guardado en la nube y en este dispositivo. No
              se puede deshacer: si quieres conservar algo, exporta antes una copia.
              {state.groups.length > 0 &&
                ' Los grupos que administras se borrarán para todos; de los demás saldrás (lo que apuntaste en ellos se queda).'}
            </p>
            <div className="backup__actions">
              <button type="button" className="btn btn--danger" onClick={() => deleteAccount()}>
                Borrar mi cuenta para siempre
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="backup__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmOut(true)}>
              Cerrar sesión
            </button>
            <button type="button" className="text-btn" onClick={() => setConfirmDelete(true)}>
              Borrar mi cuenta y mis datos
            </button>
          </div>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="backup__text">
          Inicia sesión con la misma cuenta de Google en el móvil y en el portátil y tus tareas estarán en los dos. Lo que ya
          tienes apuntado aquí se conserva.
        </p>
        <div className="backup__actions">
          <button type="button" className="btn" onClick={() => signIn()} disabled={sync.phase === 'signing-in' || sync.phase === 'starting'}>
            {sync.phase === 'signing-in' ? 'Conectando…' : 'Iniciar sesión con Google'}
          </button>
        </div>
      </>
    );
  }

  return (
    <section>
      <SectionHeader>Sincronización</SectionHeader>
      <div className="backup">
        {body}
        {sync.error && (
          <p className="backup__text backup__text--error" role="alert">
            {sync.error}
          </p>
        )}
      </div>
    </section>
  );
}

function AppVersion() {
  const [open, setOpen] = useState(false);
  const update = useUpdate();
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <p className="app-version">
        Nocta {__APP_VERSION__} · {isDesktopApp ? 'app de escritorio' : 'versión web'} ·{' '}
        <button type="button" className="app-version__link" onClick={() => setOpen(true)}>
          Novedades
        </button>{' '}
        ·{' '}
        <a className="app-version__link" href={href({ name: 'privacidad' })}>
          Privacidad
        </a>
      </p>
      {update && (
        <p className="app-version app-version--update">
          Hay una versión nueva: Nocta {update.version} ·{' '}
          <a className="app-version__link" href={update.url} target="_blank" rel="noreferrer">
            Descargar
          </a>
        </p>
      )}
      {open && <WhatsNew title="Novedades" releases={releasesBetween(null, __APP_VERSION__)} onClose={close} />}
    </>
  );
}

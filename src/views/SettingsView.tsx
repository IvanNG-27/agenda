import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { State } from '../data/types';
import { actions } from '../data/store';
import { downloadBackup, parseBackup } from '../data/backup';
import { nextColor, PALETTE, shortFrom } from '../data/defaults';
import type { Subject } from '../data/types';
import { SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { href } from '../ui';
import { signIn, signOut, useSync, type SyncStatus } from '../sync';

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

      <SyncSection />

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

      <BackupSection state={state} />
    </main>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Swatches({ label, value, onChange }: { label: string; value: string; onChange: (token: string) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {PALETTE.map((p) => (
        <button
          key={p.token}
          type="button"
          role="radio"
          aria-checked={value === p.token}
          aria-label={p.name}
          title={p.name}
          className={`swatch${value === p.token ? ' is-active' : ''}`}
          style={{ background: `var(--${p.token})` }}
          onClick={() => onChange(p.token)}
        >
          {value === p.token && <Icon name="check" size={14} />}
        </button>
      ))}
    </div>
  );
}

function SubjectsSection({ state }: { state: State }) {
  const [adding, setAdding] = useState(false);
  return (
    <section>
      <SectionHeader>Asignaturas</SectionHeader>
      <div className="list">
        {state.subjects.length === 0 && !adding && (
          <p className="backup__text">Aún no tienes asignaturas. Añade las tuyas para empezar a apuntar deberes y exámenes.</p>
        )}
        {state.subjects.map((s) => (
          <SubjectEditor key={s.id} subject={s} state={state} />
        ))}
        {adding ? (
          <NewSubject subjects={state.subjects} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" className="add-dashed" onClick={() => setAdding(true)}>
            + Añadir asignatura
          </button>
        )}
      </div>
    </section>
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

function NewSubject({ subjects, onDone }: { subjects: Subject[]; onDone: () => void }) {
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [color, setColor] = useState(() => nextColor(subjects));
  const auto = shortFrom(name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    actions.addSubject({ name: n, short: short.trim() || auto || n.slice(0, 12), color });
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
    setMessage(`Copia importada: ${plural(pending.tasks.length, 'tarea', 'tareas')} y ${plural(pending.exams.length, 'examen', 'exámenes')}.`);
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
              La copia tiene {plural(pending.tasks.length, 'tarea', 'tareas')} y {plural(pending.exams.length, 'examen', 'exámenes')}.
              Si la importas, reemplaza lo que tienes ahora ({plural(state.tasks.length, 'tarea', 'tareas')} y{' '}
              {plural(state.exams.length, 'examen', 'exámenes')}).
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

function SyncSection() {
  const sync = useSync();
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
        <div className="backup__actions">
          <button type="button" className="btn btn--secondary" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
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

import { useRef, useState, type ChangeEvent } from 'react';
import type { State } from '../data/types';
import { actions } from '../data/store';
import { downloadBackup, parseBackup } from '../data/backup';
import { PALETTE } from '../data/defaults';
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
      <PageHeader kicker="2º DAM" title="Ajustes" />

      <SyncSection />

      <section>
        <SectionHeader>Tu nombre</SectionHeader>
        <input
          className="input"
          value={state.userName}
          onChange={(e) => actions.setUserName(e.target.value)}
          aria-label="Tu nombre"
          maxLength={40}
        />
      </section>

      <section>
        <SectionHeader>Asignaturas</SectionHeader>
        <div className="list">
          {state.subjects.map((s) => (
            <div key={s.id} className="subject-edit">
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
              <div className="swatches" role="radiogroup" aria-label={`Color de ${s.name}`}>
                {PALETTE.map((p) => (
                  <button
                    key={p.token}
                    type="button"
                    role="radio"
                    aria-checked={s.color === p.token}
                    aria-label={p.name}
                    title={p.name}
                    className={`swatch${s.color === p.token ? ' is-active' : ''}`}
                    style={{ background: `var(--${p.token})` }}
                    onClick={() => actions.updateSubject(s.id, { color: p.token })}
                  >
                    {s.color === p.token && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <BackupSection state={state} />
    </main>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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

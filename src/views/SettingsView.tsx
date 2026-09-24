import type { State } from '../data/types';
import { actions } from '../data/store';
import { PALETTE } from '../data/defaults';
import { SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { href } from '../ui';

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

      <p className="note">Tus datos se guardan solo en este dispositivo.</p>
    </main>
  );
}

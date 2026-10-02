import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { State } from '../data/types';
import { compareVersions, releasesBetween, type Release } from '../data/changelog';
import { useModal, useUI } from '../ui';
import { Icon } from './Icons';

/** Última versión cuyas novedades ya vio este dispositivo. */
const SEEN_KEY = 'nocta:novedades';

/** Novedades que hay que enseñar al abrir la app después de actualizarse (vacío si no toca). */
export function pendingReleases(state: State): Release[] {
  let seen: string | null;
  try {
    seen = localStorage.getItem(SEEN_KEY);
  } catch {
    return []; // sin almacenamiento no se puede recordar: mejor no avisar en cada arranque
  }
  if (seen === null) {
    // Quien ya usaba Nocta antes de que existiera este aviso ve la versión actual; quien empieza de cero, nada.
    const hasData = state.subjects.length + state.tasks.length + state.exams.length + state.events.length > 0 || state.userName !== '';
    if (!hasData) {
      markReleasesSeen();
      return [];
    }
    return releasesBetween(null, __APP_VERSION__).slice(0, 1);
  }
  return compareVersions(seen, __APP_VERSION__) < 0 ? releasesBetween(seen, __APP_VERSION__) : [];
}

export function markReleasesSeen() {
  try {
    localStorage.setItem(SEEN_KEY, __APP_VERSION__);
  } catch {
    /* sin almacenamiento: no hay dónde recordarlo */
  }
}

type Props = { title: string; releases: Release[]; onClose: () => void };

/** Lista de cambios por versión. Hoja inferior en móvil, diálogo en escritorio.
 *  Va directa al <body> para que ningún estilo de la página que la abre la recorte. */
export function WhatsNew({ title, releases, onClose }: Props) {
  const { isDesktop } = useUI();
  const dialogRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useModal(dialogRef, onClose);
  useEffect(() => okRef.current?.focus(), []);

  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={isDesktop ? 'dialog' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="novedades-title"
      >
        <div className="form">
          <div className="form__head">
            <h2 id="novedades-title" className="form__title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <Icon name="cerrar" size={18} />
            </button>
          </div>

          {releases.map((r) => (
            <section key={r.version} className="release">
              <h3 className="release__version">
                Versión {r.version}
                {r.version === __APP_VERSION__ && <span className="release__current"> · la tuya</span>}
              </h3>
              <ul className="release__list">
                {r.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
          ))}

          <div className="form__actions">
            <span className="spacer" />
            <button ref={okRef} type="button" className="btn" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

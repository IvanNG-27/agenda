import { useState } from 'react';
import { useUpdate } from '../updates';

/** Aviso flotante en la app de escritorio cuando hay una versión nueva en GitHub.
 *  "Ahora no" lo oculta hasta que se vuelva a abrir la app. */
export function UpdateNotice() {
  const update = useUpdate();
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!update || dismissed === update.version) return null;

  return (
    <div className="update" role="status">
      <div className="update__text">
        <strong className="update__title">Nueva versión disponible</strong>
        <span>
          Nocta {update.version} ya se puede descargar. Tienes la {__APP_VERSION__}; tus datos se conservan al actualizar.
        </span>
      </div>
      <div className="update__actions">
        <button type="button" className="btn btn--secondary" onClick={() => setDismissed(update.version)}>
          Ahora no
        </button>
        <a className="btn update__btn" href={update.url} target="_blank" rel="noreferrer">
          Descargar
        </a>
      </div>
    </div>
  );
}

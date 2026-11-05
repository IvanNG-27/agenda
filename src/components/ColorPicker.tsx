// Selector de color: los colores de la paleta y uno personalizado con el selector del sistema.
// Se usa para las asignaturas (Ajustes) y para las notas.
import { useEffect, useRef, useState } from 'react';
import { HEX, PALETTE } from '../data/defaults';
import { colorCss, inkOn, luminance } from '../lib/rules';
import { Icon } from './Icons';

/** Colores de la paleta y uno personalizado (selector de color del sistema). */
export function Swatches({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  /** Añade "Sin color" (valor ''), para las notas */
  allowNone?: boolean;
}) {
  const custom = HEX.test(value);
  return (
    <>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {allowNone && (
          <button
            type="button"
            role="radio"
            aria-checked={value === ''}
            aria-label="Sin color"
            title="Sin color"
            className={`swatch swatch--none${value === '' ? ' is-active' : ''}`}
            onClick={() => onChange('')}
          >
            {value === '' && <Icon name="check" size={14} />}
          </button>
        )}
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
        <CustomSwatch value={custom ? value : null} onChange={onChange} />
      </div>
      {custom && luminance(value) < 0.03 && (
        <p className="field__hint">Este color es muy oscuro: se verá poco sobre el fondo de Nocta.</p>
      )}
    </>
  );
}

/**
 * Color personalizado. Mientras se arrastra en el selector solo cambia la vista previa; el color se guarda al
 * soltarlo (evento change), para no escribir en la nube por cada movimiento.
 */
function CustomSwatch({ value, onChange }: { value: string | null; onChange: (color: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const shown = preview ?? value;

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const commit = () => {
      setPreview(null);
      onChange(input.value.toLowerCase());
    };
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, [onChange]);

  return (
    <label
      className={`swatch swatch--custom${shown ? ' is-active' : ''}`}
      style={shown ? { background: colorCss(shown), color: inkOn(shown) } : undefined}
      title={shown ? `Personalizado (${shown})` : 'Elegir otro color'}
    >
      <input
        ref={ref}
        type="color"
        className="swatch__input"
        value={shown ?? '#7cc4ff'}
        aria-label="Color personalizado"
        onChange={(e) => setPreview(e.target.value.toLowerCase())}
      />
      {shown ? <Icon name="check" size={14} /> : <span aria-hidden="true">+</span>}
    </label>
  );
}

// Disfraz de Halloween: colores (src/styles/halloween.css), tipografía terrorífica y decoraciones.
// Solo se monta durante la semana de Halloween (ver src/lib/season.ts); fuera de ella no queda nada.
import { useEffect } from 'react';
import '@fontsource/creepster/latin-400.css'; // el archivo de la fuente solo se descarga si se usa
import '../styles/halloween.css';

/** Pone o quita el tema en <html> (y el color de la barra del navegador en el móvil). */
export function useSeasonTheme(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    root.dataset.season = 'halloween';
    meta?.setAttribute('content', '#0c0710');
    return () => {
      delete root.dataset.season;
      if (prev) meta?.setAttribute('content', prev);
    };
  }, [on]);
}

/** Telaraña en la esquina superior derecha, generada: radios desde la esquina e hilos que cuelgan entre ellos. */
function Cobweb({ size }: { size: number }) {
  const spokes = 7;
  const rings = 5;
  const angles = Array.from({ length: spokes }, (_, i) => Math.PI / 2 + (i * Math.PI) / 2 / (spokes - 1));
  const pt = (a: number, r: number) => `${(size + Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  let d = '';
  for (const a of angles) d += `M${size} 0L${pt(a, size * 1.05)}`;
  for (let k = 1; k <= rings; k++) {
    const r = ((size * k) / rings) * 0.95;
    for (let i = 0; i < spokes - 1; i++) {
      const mid = (angles[i] + angles[i + 1]) / 2;
      d += `M${pt(angles[i], r)}Q${pt(mid, r * 0.86)} ${pt(angles[i + 1], r)}`;
    }
  }
  return (
    <svg className="hw-web" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Spider() {
  const legs = 'M10 13L4 8L2 3M9 15L3 13L0 10M9 18L3 19L1 24M10 20L5 24L4 28';
  return (
    <div className="hw-spider">
      <span className="hw-spider__thread" />
      <svg viewBox="0 0 28 30" width="28" height="30">
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d={legs} />
          <path d={legs} transform="matrix(-1 0 0 1 28 0)" />
        </g>
        <ellipse cx="14" cy="17" rx="5.5" ry="6.5" fill="currentColor" />
        <circle cx="14" cy="9.5" r="3.6" fill="currentColor" />
        <circle cx="12.7" cy="9" r="1" fill="var(--accent)" />
        <circle cx="15.3" cy="9" r="1" fill="var(--accent)" />
      </svg>
    </div>
  );
}

function Ghost() {
  return (
    <svg className="hw-ghost" viewBox="0 0 40 48" width="40" height="48">
      <path d="M20 2C9 2 4 11 4 22V44L9 40L14 45L20 40L26 45L31 40L36 44V22C36 11 31 2 20 2Z" fill="var(--hw-bone)" />
      <ellipse cx="15" cy="20" rx="2.6" ry="3.4" fill="var(--bg-000)" />
      <ellipse cx="25" cy="20" rx="2.6" ry="3.4" fill="var(--bg-000)" />
      <ellipse cx="20" cy="30" rx="2.4" ry="3.4" fill="var(--bg-000)" />
    </svg>
  );
}

function Bat({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 48 18" width="36" height="14">
      <path
        d="M24 7C22 3 19 3 17 5C15 2 11 1 6 3C8 4 9 6 8 8C5 7 2 8 0 10C4 10 7 12 8 15C10 13 13 13 15 15C17 12 20 12 22 14L24 16L26 14C28 12 31 12 33 15C35 13 38 13 40 15C41 12 44 10 48 10C46 8 43 7 40 8C39 6 40 4 42 3C37 1 33 2 31 5C29 3 26 3 24 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Decoraciones: sangre goteando arriba, telaraña con araña, murciélagos y un fantasma. No se pueden pulsar. */
export function HalloweenDecor() {
  return (
    <div className="hw" aria-hidden="true">
      <div className="hw-drips" />
      <Cobweb size={170} />
      <Spider />
      <Bat className="hw-bat hw-bat--1" />
      <Bat className="hw-bat hw-bat--2" />
      <Ghost />
    </div>
  );
}

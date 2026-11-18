// Semana del lanzamiento de GTA VI (19–26 nov 2026): estética de atardecer en Miami, con neón, palmeras y letras gruesas.
// Es un homenaje original (sin logos, personajes ni tipografías del juego). Solo se monta esa semana (src/lib/season.ts).
import { useEffect, useRef, useState } from 'react';
import '@fontsource/anton/latin-400.css'; // el archivo de la fuente solo se descarga si se usa
import '../styles/launch.css';
import type { Task } from '../data/types';

/** Palmera en silueta, dibujada con hojas que salen de lo alto del tronco. */
function Palm({ className, flip }: { className: string; flip?: boolean }) {
  const leaves = [-160, -128, -96, -64, -32, -8, 18].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const len = 78 - Math.abs(i - 3) * 6;
    const ex = 70 + Math.cos(a) * len;
    const ey = 58 + Math.sin(a) * len * 0.75 + len * 0.35; // las puntas caen
    const cx = 70 + Math.cos(a) * len * 0.5;
    const cy = 58 + Math.sin(a) * len * 0.5 - 14;
    return `M70 58Q${cx.toFixed(1)} ${(cy - 8).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}Q${(cx + 4).toFixed(1)} ${(cy + 6).toFixed(1)} 70 62Z`;
  });
  return (
    <svg className={className} viewBox="0 0 140 300" width="140" height="300" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M72 300C70 230 60 160 70 60" stroke="currentColor" strokeWidth="9" fill="none" strokeLinecap="round" />
      {leaves.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
      <circle cx="66" cy="66" r="5" fill="currentColor" />
      <circle cx="75" cy="68" r="5" fill="currentColor" />
    </svg>
  );
}

/** Estrellas de "nivel de búsqueda": una por cada tarea atrasada (hasta cinco). */
function Wanted({ level }: { level: number }) {
  return (
    <div className="vc-wanted" title={level ? `Nivel de búsqueda: ${level} (tareas atrasadas)` : undefined}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < level ? 'is-on' : undefined}>
          ★
        </span>
      ))}
    </div>
  );
}

/** Al marcar una tarea como hecha: cartel de misión cumplida. */
function useMissionPassed(tasks: Task[]) {
  const done = tasks.filter((t) => t.done).length;
  const prev = useRef(done);
  const [show, setShow] = useState(0);
  useEffect(() => {
    if (done > prev.current) setShow((n) => n + 1);
    prev.current = done;
  }, [done]);
  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => setShow(0), 2600);
    return () => window.clearTimeout(id);
  }, [show]);
  return show;
}

export function LaunchDecor({ tasks, today }: { tasks: Task[]; today: string }) {
  const late = tasks.filter((t) => !t.done && t.dueDate < today).length;
  const mission = useMissionPassed(tasks);
  return (
    <>
      {/* Fondo: atardecer con sol a rayas y palmeras (detrás del contenido) */}
      <div className="vc-bg" aria-hidden="true">
        <div className="vc-sun" />
        <Palm className="vc-palm vc-palm--l" />
        <Palm className="vc-palm vc-palm--r" flip />
      </div>
      <div className="vc-hud" aria-hidden="true">
        <Wanted level={Math.min(late, 5)} />
      </div>
      {mission > 0 && (
        <div key={mission} className="vc-mission" role="status">
          <span className="vc-mission__title">¡Misión cumplida!</span>
          <span className="vc-mission__sub">Respeto +</span>
        </div>
      )}
    </>
  );
}

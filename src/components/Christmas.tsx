// Navidad: colores (src/styles/christmas.css), letra navideña en los títulos y decoraciones.
// Solo se monta del 1 de diciembre al 8 de enero (ver src/lib/season.ts); fuera de esas fechas no queda nada.
import '@fontsource/mountains-of-christmas/latin-700.css'; // el archivo de la fuente solo se descarga si se usa
import '../styles/christmas.css';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

// Copos con posiciones y ritmos variados pero fijos (sin Math.random: igual en cada carga)
const FLAKES = Array.from({ length: 36 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    size: 3 + Math.round(r(2) * 5),
    duration: `${(9 + r(3) * 11).toFixed(1)}s`,
    delay: `${(-r(4) * 20).toFixed(1)}s`,
    sway: `${Math.round(10 + r(5) * 30)}px`,
    star: i % 6 === 0,
  };
});

function Snow() {
  return (
    <div className="xm-snow">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className={f.star ? 'xm-flake xm-flake--star' : 'xm-flake'}
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            fontSize: f.size * 3,
            animationDuration: f.duration,
            animationDelay: f.delay,
            ['--sway' as string]: f.sway,
          }}
        >
          {f.star ? '❄' : null}
        </span>
      ))}
    </div>
  );
}

/** Guirnalda de luces que parpadean a lo largo del borde de arriba. */
function Lights() {
  return (
    <div className="xm-lights">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className="xm-bulb" />
      ))}
    </div>
  );
}

/** Trineo de Papá Noel tirado por dos renos (el de delante, con la nariz roja), que cruza de vez en cuando. */
function Sleigh() {
  const reindeer = (x: number, nose: boolean) => (
    <g transform={`translate(${x} 0)`}>
      {/* astas */}
      <path d="M30 8L32 2M32 2L30 0M32 2L35 1M31 6L28 3" stroke="#8a5a2b" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* cuerpo, cuello y cabeza */}
      <ellipse cx="18" cy="19" rx="11" ry="5.5" fill="#8a5a2b" />
      <path d="M26 16L30 9L33 10L29 18Z" fill="#8a5a2b" />
      <ellipse cx="33" cy="10" rx="4" ry="2.6" fill="#9b6935" />
      <circle cx="31.5" cy="9" r="0.7" fill="#1b1b1b" />
      <circle cx="37" cy="10.5" r="1.6" fill={nose ? '#ff3b3b' : '#3a2412'} className={nose ? 'xm-nose' : undefined} />
      {/* patas al galope y cola */}
      <path d="M11 23L6 29M14 24L12 30M22 24L26 29M25 23L30 27" stroke="#8a5a2b" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 17L4 15" stroke="#f3eee2" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
  return (
    <svg className="xm-sleigh" viewBox="0 0 170 36" width="170" height="36">
      {/* riendas */}
      <path d="M58 18Q90 10 104 16Q120 11 134 13" stroke="#e9c46a" strokeWidth="0.9" fill="none" />
      {reindeer(96, false)}
      {reindeer(128, true)}
      {/* Papá Noel */}
      <circle cx="30" cy="9" r="5" fill="#f2c9a0" />
      <path d="M24 8Q29 -2 37 5L39 2" stroke="#d62839" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <circle cx="39.5" cy="2" r="2" fill="#f3eee2" />
      <path d="M25 10Q30 20 35 10Z" fill="#f3eee2" />
      <rect x="22" y="13" width="16" height="9" rx="3" fill="#d62839" />
      {/* saco de regalos */}
      <path d="M8 20Q6 9 14 8Q22 9 19 20Z" fill="#7b4b2a" />
      {/* trineo */}
      <path d="M4 18H58Q60 18 59 22L56 28H10Q4 28 4 22Z" fill="#b5172b" />
      <path d="M2 32H58Q64 32 66 27" stroke="#e9c46a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M14 28V32M50 28V32" stroke="#e9c46a" strokeWidth="2" />
      <path d="M8 22H55" stroke="#e9c46a" strokeWidth="1.2" />
    </svg>
  );
}

type NutMode = 'patrol' | 'drag' | 'fall' | 'land' | 'dizzy';

const GRAVITY = 2600; // px/s²
const CROSSING = 13; // segundos en cruzar la pantalla
const EDGE_PAUSE = 1.3; // segundos parado en cada lado antes de dar la vuelta
const DIZZY = 2.4; // segundos sentado y mareado tras el culazo
const LAND = 0.35; // segundos flexionando las piernas al caer de poca altura

/**
 * Soldado cascanueces que patrulla por el "suelo" de la pantalla (empieza a la derecha, hacia la izquierda).
 * Se puede coger y arrastrar a cualquier sitio: al soltarlo cae, se da un culazo, se marea un momento (estrellitas)
 * y vuelve a patrullar desde donde ha caído. Lo mueve JavaScript (no una animación fija) para saber siempre dónde está.
 */
function Nutcracker() {
  const ref = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<NutMode>('patrol');
  // tx/ty: adonde lleva el puntero mientras se arrastra (el muñeco lo sigue con suavidad); tilt: balanceo al moverlo
  const s = useRef({
    mode: 'patrol' as NutMode, x: -1, y: -1, vy: 0, dir: -1, wait: 0, dizzy: 0, dx: 0, dy: 0,
    tx: 0, ty: 0, tilt: 0,
    vx: 0, top: 0, // inercia horizontal al lanzarlo y punto más alto del vuelo (decide el culazo)
    trail: [] as { t: number; x: number; y: number }[], // últimas posiciones del puntero, para la velocidad al soltar
  });
  // Medidas (tamaño, suelo y lados): se leen al empezar y al cambiar el tamaño de la ventana, no en cada fotograma
  const dims = useRef({ w: 44, h: 104, minX: 0, maxX: 0, floor: 0 });

  useEffect(() => {
    const el = ref.current;
    const floorEl = floorRef.current;
    if (!el || !floorEl) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const st = s.current;
    const go = (m: NutMode) => {
      st.mode = m;
      setMode(m);
    };
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Suelo y lados salen del CSS (cambian en el móvil: barra de pestañas y botón +)
      const cs = getComputedStyle(el);
      const minX = parseFloat(cs.getPropertyValue('--m-left')) || 0;
      dims.current = {
        w,
        h,
        minX,
        maxX: window.innerWidth - (parseFloat(cs.getPropertyValue('--m-right')) || 0) - w,
        floor: floorEl.getBoundingClientRect().top - h,
      };
    };
    measure();
    window.addEventListener('resize', measure);
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // si la pestaña estuvo oculta, sin saltos
      last = now;
      const { minX, maxX, floor } = dims.current;
      if (st.x < 0) st.x = maxX; // empieza a la derecha

      if (st.mode === 'drag') {
        // Sigue al puntero con un muelle suave (igual a 60 o a 120 Hz) y se balancea colgando de la mano
        const px = st.x;
        const k = 1 - Math.exp(-dt * 24);
        st.x += (st.tx - st.x) * k;
        st.y += (st.ty - st.y) * k;
        const vx = dt > 0 ? (st.x - px) / dt : 0;
        const target = Math.max(-28, Math.min(28, vx * 0.03));
        st.tilt += (target - st.tilt) * (1 - Math.exp(-dt * 10));
        el.style.setProperty('--tilt', `${st.tilt.toFixed(2)}deg`);
      } else if (st.mode === 'patrol') {
        st.y = floor;
        if (still.matches) st.x = maxX; // con "reducir movimiento" no patrulla
        else if (st.wait > 0) st.wait -= dt;
        else {
          st.x += st.dir * ((maxX - minX) / CROSSING) * dt;
          // Da la vuelta al llegar a un lado (si viene de fuera de la ronda tras resbalar, primero vuelve andando)
          if ((st.dir < 0 && st.x <= minX) || (st.dir > 0 && st.x >= maxX)) {
            st.x = st.dir < 0 ? minX : maxX;
            st.dir = -st.dir;
            st.wait = EDGE_PAUSE;
          }
        }
      } else if (st.mode === 'fall') {
        // Vuelo con inercia: gravedad, algo de rozamiento con el aire y rebotes contra los bordes de la pantalla
        const right = window.innerWidth - dims.current.w;
        st.vy += GRAVITY * dt;
        st.vx *= Math.exp(-dt * 0.8);
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        if (st.x < 0 || st.x > right) {
          st.x = st.x < 0 ? 0 : right;
          st.vx = -st.vx * 0.55;
        }
        if (st.y < 0) {
          st.y = 0;
          st.vy = -st.vy * 0.4;
        }
        st.top = Math.min(st.top, st.y);
        // Se inclina hacia donde va y gira con el aire
        const lean = Math.max(-35, Math.min(35, st.vx * 0.025));
        st.tilt += (lean - st.tilt) * (1 - Math.exp(-dt * 8));
        el.style.setProperty('--tilt', `${st.tilt.toFixed(2)}deg`);
        if (st.y >= floor || still.matches) {
          st.y = floor;
          // Si en algún momento estuvo en la mitad de arriba (al soltarlo o al subir lanzado): culazo y mareo.
          // Desde más abajo: cae de pie y sigue.
          const high = st.top + dims.current.h / 2 < window.innerHeight / 2;
          const next = still.matches ? 'patrol' : high ? 'dizzy' : 'land';
          st.dizzy = next === 'dizzy' ? DIZZY : LAND;
          go(next);
        }
      } else if (st.mode === 'dizzy' || st.mode === 'land') {
        st.y = floor;
        // Si cae con impulso, resbala por el suelo hasta frenar (sin salirse de la pantalla)
        if (Math.abs(st.vx) > 1) {
          const right = window.innerWidth - dims.current.w;
          st.vx *= Math.exp(-dt * 6);
          st.x += st.vx * dt;
          if (st.x < 0 || st.x > right) {
            st.x = st.x < 0 ? 0 : right;
            st.vx = -st.vx * 0.3;
          }
        }
        st.dizzy -= dt;
        if (st.dizzy <= 0) {
          // Vuelve a patrullar desde donde ha caído: hacia dentro si resbaló fuera de la ronda, si no hacia el lado más lejano
          st.vx = 0;
          st.dir = st.x < minX ? 1 : st.x > maxX ? -1 : st.x - minX > maxX - st.x ? -1 : 1;
          go('patrol');
        }
      }
      el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const follow = (e: PointerEvent) => {
    const st = s.current;
    if (st.mode !== 'drag') return;
    const { w, h } = dims.current;
    st.tx = Math.min(Math.max(e.clientX - st.dx, 0), window.innerWidth - w);
    st.ty = Math.min(Math.max(e.clientY - st.dy, 0), window.innerHeight - h);
    st.trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (st.trail.length > 8) st.trail.shift();
  };
  const drop = (e: PointerEvent) => {
    const st = s.current;
    if (st.mode !== 'drag') return;
    // Velocidad al soltar: la del puntero en los últimos 100 ms (si estaba quieto, cae en vertical)
    const recent = st.trail.filter((p) => e.timeStamp - p.t <= 100);
    let vx = 0;
    let vy = 0;
    if (recent.length >= 2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      const span = Math.max(b.t - a.t, 8) / 1000;
      const MAX = 2600;
      vx = Math.max(-MAX, Math.min(MAX, (b.x - a.x) / span));
      vy = Math.max(-MAX, Math.min(MAX, (b.y - a.y) / span));
    }
    st.vx = vx;
    st.vy = vy;
    st.top = st.y;
    st.mode = 'fall';
    setMode('fall');
  };

  return (
    <>
      <div ref={floorRef} className="xm-nut-floor" aria-hidden="true" />
      <div
        ref={ref}
        className={`xm-nut is-${mode}`}
        aria-hidden="true"
        onPointerDown={(e) => {
          const st = s.current;
          st.dx = e.clientX - st.x;
          st.dy = e.clientY - st.y;
          st.tx = st.x;
          st.ty = st.y;
          st.tilt = 0;
          st.trail = [];
          st.mode = 'drag';
          setMode('drag');
          e.currentTarget.setPointerCapture(e.pointerId);
          e.preventDefault();
        }}
        onPointerMove={follow}
        onPointerUp={drop}
        onPointerCancel={drop}
      >
        <div className="xm-nut__step">
          <div className="xm-nut__wobble">
            <NutcrackerFigure />
          </div>
        </div>
        {mode === 'dizzy' && (
          <div className="xm-stars">
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>
        )}
      </div>
    </>
  );
}

function NutcrackerFigure() {
  return (
    <svg className="xm-nutcracker" viewBox="0 0 44 104" width="44" height="104">
      {/* penacho y gorro */}
      <ellipse cx="22" cy="5" rx="5" ry="4" fill="#f3eee2" />
      <rect x="11" y="7" width="22" height="22" rx="3" fill="#15172a" />
      <rect x="11" y="23" width="22" height="4" fill="#e9c46a" />
      <circle cx="22" cy="16" r="3" fill="#e9c46a" />
      {/* cara */}
      <rect x="12" y="29" width="20" height="17" rx="4" fill="#f2c9a0" />
      <circle cx="17.5" cy="34.5" r="1.3" fill="#15172a" />
      <circle cx="26.5" cy="34.5" r="1.3" fill="#15172a" />
      <circle cx="15" cy="39" r="1.8" fill="#f08a8a" opacity="0.8" />
      <circle cx="29" cy="39" r="1.8" fill="#f08a8a" opacity="0.8" />
      {/* bigote y barba */}
      <path d="M16 40Q22 37 28 40Q25 42 22 41Q19 42 16 40Z" fill="#f3eee2" />
      <path d="M13 42Q22 54 31 42V46Q22 56 13 46Z" fill="#f3eee2" />
      <rect x="19" y="42" width="6" height="2.5" rx="1" fill="#15172a" />
      {/* casaca roja con botones y charreteras */}
      <rect x="10" y="49" width="24" height="26" rx="3" fill="#c81d32" />
      <rect x="6" y="49" width="7" height="5" rx="2.5" fill="#e9c46a" />
      <rect x="31" y="49" width="7" height="5" rx="2.5" fill="#e9c46a" />
      <path d="M12 51L32 73M32 51L12 73" stroke="#f3eee2" strokeWidth="2" />
      <circle cx="22" cy="57" r="1.4" fill="#e9c46a" />
      <circle cx="22" cy="63" r="1.4" fill="#e9c46a" />
      <circle cx="22" cy="69" r="1.4" fill="#e9c46a" />
      <rect x="10" y="71" width="24" height="4" fill="#15172a" />
      <rect x="20" y="71" width="4" height="4" fill="#e9c46a" />
      {/* brazos con guantes */}
      <rect x="5" y="52" width="6" height="20" rx="3" fill="#c81d32" />
      <rect x="33" y="52" width="6" height="20" rx="3" fill="#c81d32" />
      <circle cx="8" cy="73" r="3" fill="#f3eee2" />
      <circle cx="36" cy="73" r="3" fill="#f3eee2" />
      {/* pantalón y botas */}
      <rect x="12" y="75" width="9" height="18" fill="#1f3a8a" />
      <rect x="23" y="75" width="9" height="18" fill="#1f3a8a" />
      <rect x="11" y="91" width="11" height="11" rx="2" fill="#15172a" />
      <rect x="22" y="91" width="11" height="11" rx="2" fill="#15172a" />
    </svg>
  );
}

/**
 * Decoraciones de Navidad: luces arriba, nieve y el trineo con los renos (no se pueden pulsar), más el cascanueces,
 * que va en su propia capa: por encima del contenido y por debajo del botón + y la barra, para no taparlos nunca.
 */
export function ChristmasDecor() {
  return (
    <>
      <div className="xm" aria-hidden="true">
        <Snow />
        <Lights />
        <Sleigh />
      </div>
      <Nutcracker />
    </>
  );
}

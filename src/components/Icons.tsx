// Iconos de trazo 1,75 px con esquinas redondeadas. `.ic-body` es la forma que se rellena de accent cuando el ítem está activo.
import type { ReactNode } from 'react';

export type IconName =
  | 'hoy' | 'calendario' | 'tablero' | 'examenes' | 'semana' | 'ajustes'
  | 'buscar' | 'mas' | 'izq' | 'der' | 'check' | 'cerrar';

const paths: Record<IconName, ReactNode> = {
  hoy: (
    <>
      <rect className="ic-body" x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path className="ic-detail" d="m8.5 12.2 2.4 2.4 4.8-5" />
    </>
  ),
  calendario: (
    <>
      <rect className="ic-body" x="3.5" y="5" width="17" height="15.5" rx="4.5" />
      <path className="ic-detail" d="M3.5 10h17" />
      <path d="M8 3v3.5M16 3v3.5" />
    </>
  ),
  semana: (
    <>
      <rect className="ic-body" x="3.5" y="4.5" width="17" height="15" rx="4.5" />
      <path className="ic-detail" d="M9.2 8.5v7M14.8 8.5v7" />
    </>
  ),
  tablero: (
    <>
      <rect className="ic-body" x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path className="ic-detail" d="M9.5 3.5v17M14.5 3.5v10" />
    </>
  ),
  examenes: (
    <>
      <path className="ic-body" d="M7 3.5h7.5l4.5 4.5v9.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z" />
      <path className="ic-detail" d="M8.5 12.5h7M8.5 16h4.5" />
    </>
  ),
  ajustes: (
    <>
      <path className="ic-body" d="M12 3.5l2 2.2 2.9-.4.6 2.9 2.6 1.4-1.2 2.7 1.2 2.7-2.6 1.4-.6 2.9-2.9-.4-2 2.2-2-2.2-2.9.4-.6-2.9-2.6-1.4 1.2-2.7-1.2-2.7 2.6-1.4.6-2.9 2.9.4Z" />
      <circle className="ic-detail" cx="12" cy="12" r="2.8" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  izq: <path d="m14.5 6-6 6 6 6" />,
  der: <path d="m9.5 6 6 6-6 6" />,
  check: <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />,
  cerrar: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

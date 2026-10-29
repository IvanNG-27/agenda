// Temporadas: durante la semana de Halloween (26 de octubre – 1 de noviembre, todos los años) Nocta se disfraza.
// El 2 de noviembre todo vuelve a ser como siempre, sin hacer nada: depende solo de la fecha de hoy.
import { useSyncExternalStore } from 'react';

/** Del 26 de octubre al 1 de noviembre, ambos incluidos. `iso` es la fecha local de hoy (yyyy-mm-dd). */
export function isHalloween(iso: string): boolean {
  const md = iso.slice(5);
  return md >= '10-26' && md <= '11-01';
}

// Quien no quiera arañas ni sangre puede quitar la decoración ese año (vuelve al siguiente)
const OFF_KEY = 'nocta:halloween-off';
const listeners = new Set<() => void>();

function offYear(): string | null {
  try {
    return localStorage.getItem(OFF_KEY);
  } catch {
    return null;
  }
}

export function setHalloweenOff(year: string, off: boolean) {
  try {
    if (off) localStorage.setItem(OFF_KEY, year);
    else localStorage.removeItem(OFF_KEY);
  } catch {
    /* sin almacenamiento la decoración se queda puesta */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** 'on': disfrazada · 'off': es Halloween pero se ha quitado · 'none': no es Halloween */
export function useHalloween(today: string): 'on' | 'off' | 'none' {
  const off = useSyncExternalStore(subscribe, offYear);
  if (!isHalloween(today)) return 'none';
  return off === today.slice(0, 4) ? 'off' : 'on';
}

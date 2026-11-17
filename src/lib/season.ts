// Temporadas: Nocta se disfraza en Halloween (26 de octubre – 1 de noviembre) y en Navidad (1 de diciembre – 8 de enero),
// todos los años. Al acabar vuelve a ser como siempre sin hacer nada: depende solo de la fecha de hoy.
import { useSyncExternalStore } from 'react';

// Solo en desarrollo (npm run dev): ?temporada=navidad o ?temporada=halloween para verlas cualquier día.
// En la web publicada esto no existe: Vite lo quita al compilar.
const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get('temporada') : null;

/** Del 26 de octubre al 1 de noviembre, ambos incluidos. `iso` es la fecha local de hoy (yyyy-mm-dd). */
export function isHalloween(iso: string): boolean {
  if (forced) return forced === 'halloween';
  const md = iso.slice(5);
  return md >= '10-26' && md <= '11-01';
}

/** Del 1 de diciembre al 8 de enero, ambos incluidos. */
export function isChristmas(iso: string): boolean {
  if (forced) return forced === 'navidad';
  const md = iso.slice(5);
  return md >= '12-01' || md <= '01-08';
}

/** Año en que empezó esta Navidad (en enero, el anterior): con él se recuerda si se ha quitado la decoración. */
export const christmasYear = (iso: string) => String(Number(iso.slice(0, 4)) - (iso.slice(5, 7) === '01' ? 1 : 0));

// Quien no quiera la decoración puede quitarla esa temporada (vuelve la siguiente)
const OFF_KEY = 'nocta:halloween-off';
const XMAS_OFF_KEY = 'nocta:navidad-off';
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
const offYear = () => read(OFF_KEY);
const xmasOffYear = () => read(XMAS_OFF_KEY);

function setOff(key: string, year: string, off: boolean) {
  try {
    if (off) localStorage.setItem(key, year);
    else localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento la decoración se queda puesta */
  }
  listeners.forEach((l) => l());
}

export const setHalloweenOff = (year: string, off: boolean) => setOff(OFF_KEY, year, off);
export const setChristmasOff = (year: string, off: boolean) => setOff(XMAS_OFF_KEY, year, off);

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

/** 'on': decorada · 'off': es Navidad pero se ha quitado · 'none': no es Navidad */
export function useChristmas(today: string): 'on' | 'off' | 'none' {
  const off = useSyncExternalStore(subscribe, xmasOffYear);
  if (!isChristmas(today)) return 'none';
  return off === christmasYear(today) ? 'off' : 'on';
}

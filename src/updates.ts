// Aviso de versión nueva para la app de escritorio. La web se actualiza sola (service worker);
// el .exe no, así que consulta la última Release de GitHub y avisa si hay una más nueva que descargar.
import { useSyncExternalStore } from 'react';
import { isDesktopApp } from './sync/config';
import { compareVersions } from './data/changelog';

const REPO = 'IvanNG-27/agenda';
const EVERY = 6 * 60 * 60 * 1000; // además de al arrancar, cada 6 horas si la app sigue abierta

export type Update = { version: string; url: string };

let update: Update | null = null;
const listeners = new Set<() => void>();

export const useUpdate = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => update,
  );

/** Última Release publicada, si es más nueva que esta app y trae el instalador. */
async function latestRelease(): Promise<Update | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null; // 404 = aún no hay ninguna Release
  const r = (await res.json()) as { tag_name?: string; html_url?: string; assets?: { name: string }[] };
  const version = (r.tag_name ?? '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version) || compareVersions(version, __APP_VERSION__) <= 0) return null;
  // Una Release sin la app (.zip o .exe; aún subiéndose, o mal hecha) no sirve para actualizar
  if (!r.assets?.some((a) => /\.(zip|exe)$/i.test(a.name))) return null;
  return { version, url: r.html_url ?? `https://github.com/${REPO}/releases/latest` };
}

async function check() {
  try {
    const found = await latestRelease();
    if (found && found.version !== update?.version) {
      update = found;
      listeners.forEach((l) => l());
    }
  } catch {
    /* sin conexión o GitHub no responde: se vuelve a intentar en la próxima comprobación */
  }
}

export function startUpdateChecks() {
  if (!isDesktopApp) return;
  void check();
  setInterval(check, EVERY);
}

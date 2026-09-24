// Estado de la sincronización para la interfaz. Firebase se carga bajo demanda (import dinámico)
// para que no retrase el arranque de la app.
import { useSyncExternalStore } from 'react';
import { isConfigured, isDesktopApp } from './config';

export type SyncPhase =
  | 'desktop' // app de escritorio: sin sincronización
  | 'unconfigured' // falta la configuración de Firebase
  | 'starting'
  | 'signed-out'
  | 'signing-in'
  | 'synced'
  | 'pending' // hay cambios esperando a subirse
  | 'offline';

export type SyncStatus = {
  phase: SyncPhase;
  email?: string;
  error?: string;
};

let status: SyncStatus = { phase: isDesktopApp ? 'desktop' : isConfigured ? 'starting' : 'unconfigured' };
const listeners = new Set<() => void>();

export function setSyncStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const getSyncStatus = () => status;

export const useSync = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );

const available = !isDesktopApp && isConfigured;
const load = () => import('./firebase');

export async function startSync() {
  if (!available) return;
  try {
    (await load()).start();
  } catch (err) {
    setSyncStatus({ phase: 'signed-out', error: messageFor(err) });
  }
}

export async function signIn() {
  if (!available) return;
  setSyncStatus({ ...status, phase: 'signing-in', error: undefined });
  try {
    await (await load()).signIn();
  } catch (err) {
    setSyncStatus({ phase: 'signed-out', error: messageFor(err) });
  }
}

export async function signOut() {
  if (!available) return;
  await (await load()).signOut();
}

/** Traduce los errores de Firebase a mensajes útiles en español. */
export function messageFor(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Añádelo en Authentication → Configuración → Dominios autorizados.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con Google no está activado en Firebase (Authentication → Método de acceso).';
    case 'auth/network-request-failed':
      return 'No hay conexión. Inténtalo cuando tengas internet.';
    case 'permission-denied':
      return 'Firebase ha rechazado el acceso a los datos. Revisa las reglas de Firestore.';
    default:
      return code ? `No se pudo conectar con Firebase (${code}).` : 'No se pudo conectar con Firebase.';
  }
}

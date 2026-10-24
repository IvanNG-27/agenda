// Notificaciones de los recordatorios.
//
// - Escritorio (.exe): avisos de Windows a través del proceso principal (electron/preload.cjs). La app sigue junto al
//   reloj al cerrar la ventana, así que avisa mientras no se salga de ella.
// - Web con sesión y navegador compatible: push con Firebase Cloud Messaging; llegan aunque Nocta esté cerrada
//   (ver src/sync/firebase.ts y scripts/reminders/send.mjs).
// - Web sin push: la propia app avisa mientras está abierta.
import { useSyncExternalStore } from 'react';
import { getState } from '../data/store';
import { upcomingReminders, type Reminder } from '../lib/reminders';
import { enablePush } from '../sync';

/** off: sin permiso todavía · local: avisa la app abierta (o junto al reloj) · push: también con la app cerrada */
export type NotifyState = 'unsupported' | 'blocked' | 'off' | 'local' | 'push';
export type NotifyStatus = { state: NotifyState; note?: string };

const desktop = () => typeof window !== 'undefined' && !!window.noctaDesktop;
const PUSH_KEY = 'nocta:push'; // lo escribe src/sync/firebase.ts al registrar el dispositivo
const LAST_KEY = 'nocta:avisos-hasta';

function readState(): NotifyState {
  if (desktop()) return 'local';
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  try {
    return localStorage.getItem(PUSH_KEY) ? 'push' : 'local';
  } catch {
    return 'local';
  }
}

let status: NotifyStatus = { state: readState() };
const listeners = new Set<() => void>();
function setStatus(next: NotifyStatus) {
  status = next;
  listeners.forEach((l) => l());
}
const refresh = () => {
  const state = readState();
  if (state !== status.state) setStatus({ state, note: status.note });
};

export const useNotify = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );

const NOTES: Record<string, string> = {
  'sin-sesion': 'Te avisará mientras Nocta esté abierta. Inicia sesión para recibir los avisos también con la app cerrada.',
  'no-compatible':
    'Este navegador solo puede avisar con Nocta abierta. En iPhone o iPad, añade Nocta a la pantalla de inicio y activa los avisos desde allí.',
  'sin-clave': 'Te avisará mientras Nocta esté abierta.',
  error: 'No se pudieron activar los avisos con la app cerrada. Te avisará mientras Nocta esté abierta.',
};

/** Pide permiso y, si se puede, registra el dispositivo para recibir push. */
export async function enableNotifications() {
  if (desktop() || typeof Notification === 'undefined') return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    setStatus({ state: readState() });
    return;
  }
  const reason = await enablePush();
  setStatus({ state: readState(), note: reason ? NOTES[reason] : undefined });
}

/** Intenta pasar a push cuando ya hay permiso (por ejemplo, justo después de iniciar sesión). */
export async function upgradeToPush() {
  if (desktop() || readState() !== 'local') return;
  const reason = await enablePush();
  setStatus({ state: readState(), note: reason ? NOTES[reason] : undefined });
}

const icon = () => `${import.meta.env.BASE_URL}icon-512.png`;

async function show(r: Pick<Reminder, 'key' | 'title' | 'body'>) {
  if (window.noctaDesktop) {
    window.noctaDesktop.notify(r.title, r.body);
    return;
  }
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg) {
    await reg.showNotification(r.title, { body: r.body, icon: icon(), badge: icon(), tag: r.key });
  } else {
    new Notification(r.title, { body: r.body, icon: icon(), tag: r.key });
  }
}

export function testNotification() {
  void show({ key: 'prueba', title: '🔔 Así te avisará Nocta', body: 'Los recordatorios llegarán como esta notificación.' });
}

function readLast(): number {
  try {
    return Number(localStorage.getItem(LAST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLast(t: number) {
  try {
    localStorage.setItem(LAST_KEY, String(t));
  } catch {
    /* sin almacenamiento: puede repetir algún aviso tras recargar */
  }
}

/** Revisa si ha vencido algún recordatorio desde la última vez y lo muestra (solo en modo local). */
function tick() {
  const now = Date.now();
  if (status.state !== 'local') {
    writeLast(now); // en push avisa el servidor; al volver a local no se repite lo anterior
    return;
  }
  // Si la app estuvo cerrada, se avisa de lo que venció en las últimas 2 horas, no de todo lo antiguo
  const from = Math.max(readLast() || now, now - 2 * 60 * 60_000);
  for (const r of upcomingReminders(getState(), from)) {
    if (r.at > now) break;
    void show(r).catch(() => {});
  }
  writeLast(now);
}

export function startNotifications() {
  if (!readLast()) writeLast(Date.now());
  tick();
  setInterval(tick, 30_000);
  document.addEventListener('visibilitychange', () => {
    refresh();
    tick();
  });
}

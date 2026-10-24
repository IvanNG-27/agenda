// Se carga dentro del service worker de la PWA (vite.config.ts → workbox.importScripts).
// Muestra los recordatorios que llegan por push (Firebase Cloud Messaging, mensajes de solo datos que envía
// scripts/reminders/send.mjs) aunque Nocta esté cerrada, y abre la app al tocarlos.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // FCM entrega { data: {...}, from, fcmMessageId }; se aceptan también los datos sueltos
  const data = payload.data || payload;
  const title = typeof data.title === 'string' && data.title ? data.title.slice(0, 150) : 'Nocta';
  const body = typeof data.body === 'string' ? data.body.slice(0, 280) : '';
  const icon = new URL('icon-512.png', self.registration.scope).href;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag: typeof data.tag === 'string' ? data.tag.slice(0, 200) : undefined,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(url));
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});

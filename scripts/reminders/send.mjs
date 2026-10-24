// Envía por push los recordatorios que han vencido. Lo ejecuta GitHub Actions cada 5 minutos
// (.github/workflows/recordatorios.yml) con una cuenta de servicio de Firebase en el secreto FIREBASE_SERVICE_ACCOUNT.
//
// reminders/{uid}_{clave} → { uid, item, at, title, body?, yearly? }   (los escribe la app, ver src/sync/firebase.ts)
// users/{uid}/devices/{id} → { token, platform, updatedAt }              (navegadores que reciben push)
//
// Cada recordatorio enviado se borra, salvo los anuales, que pasan al año siguiente.
// Pruebas: DRY_RUN=1 no envía nada (solo lo muestra); con FIRESTORE_EMULATOR_HOST usa el emulador.
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const DRY_RUN = process.env.DRY_RUN === '1';
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const account = process.env.FIREBASE_SERVICE_ACCOUNT;
const APP_URL = 'https://ivanng-27.github.io/agenda/';
const LATE = 12 * 60 * 60_000; // lo que venció hace más de 12 h (p. ej., si el envío estuvo parado) ya no se avisa

if (!account && !emulator) {
  console.log('Sin FIREBASE_SERVICE_ACCOUNT: los recordatorios con la app cerrada no están configurados.');
  process.exit(0);
}

initializeApp(account ? { credential: cert(JSON.parse(account)) } : { projectId: process.env.GCLOUD_PROJECT ?? 'demo-nocta' });
const db = getFirestore();
const messaging = getMessaging();

/** Mismo día y hora local del año siguiente (cumpleaños, aniversarios). Zona de España. */
function nextYear(at) {
  const d = new Date(at);
  d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}

const now = Date.now();
const due = await db.collection('reminders').where('at', '<=', now).orderBy('at').limit(500).get();
const tokensByUser = new Map();
let sent = 0;
let skipped = 0;

async function tokensOf(uid) {
  if (!tokensByUser.has(uid)) {
    const snap = await db.collection('users').doc(uid).collection('devices').get();
    tokensByUser.set(uid, snap.docs.filter((d) => typeof d.data().token === 'string').map((d) => ({ ref: d.ref, token: d.data().token })));
  }
  return tokensByUser.get(uid);
}

for (const doc of due.docs) {
  const r = doc.data();
  const valid = typeof r.uid === 'string' && typeof r.title === 'string' && typeof r.at === 'number' && doc.id === `${r.uid}_${r.item}`;
  if (valid && now - r.at <= LATE) {
    const devices = await tokensOf(r.uid);
    if (devices.length) {
      const data = { title: r.title.slice(0, 150), body: typeof r.body === 'string' ? r.body.slice(0, 280) : '', tag: doc.id.slice(0, 200) };
      const messages = devices.map((d) => ({
        token: d.token,
        data,
        webpush: { headers: { Urgency: 'high', TTL: '86400' }, fcmOptions: { link: APP_URL } },
      }));
      if (DRY_RUN) {
        console.log(`[prueba] ${messages.length} aviso(s) para ${r.uid}: ${data.title} · ${data.body}`);
        sent += messages.length;
      } else {
        const res = await messaging.sendEach(messages);
        sent += res.successCount;
        // Los navegadores que ya no existen se quitan de la cuenta
        await Promise.all(
          res.responses.map((x, i) =>
            !x.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'].includes(x.error?.code ?? '')
              ? devices[i].ref.delete()
              : null,
          ),
        );
      }
    }
  } else {
    skipped++;
  }
  if (r.yearly === true && valid) await doc.ref.update({ at: nextYear(r.at) });
  else await doc.ref.delete();
}

console.log(`Recordatorios vencidos: ${due.size} · avisos enviados: ${sent} · descartados: ${skipped}${DRY_RUN ? ' (prueba, sin enviar)' : ''}`);

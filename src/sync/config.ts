// Configuración del proyecto de Firebase (consola de Firebase → Configuración del proyecto → Tus apps → Web).
// Estos valores no son secretos: identifican el proyecto. Lo que protege los datos son las reglas de firestore.rules.
const projectConfig = {
  apiKey: 'AIzaSyAVWThnI1-meVwvMWuopVqM9JRXY4rH5lQ',
  // El mismo dominio que la app: los archivos de inicio de sesión de Firebase se sirven en
  // https://ivanng-27.github.io/__/auth/ (repositorio IvanNG-27.github.io). Con nocta-5f52e.firebaseapp.com,
  // Safari (iPhone), Chrome y Firefox recientes bloquean el almacenamiento entre sitios y el inicio de sesión
  // vuelve sin sesión y sin error.
  authDomain: 'ivanng-27.github.io',
  projectId: 'nocta-5f52e',
  storageBucket: 'nocta-5f52e.firebasestorage.app',
  messagingSenderId: '101342059035',
  appId: '1:101342059035:web:fcc0e985aa85cbfab8b6be',
};

/**
 * Clave de sitio de reCAPTCHA Enterprise para Firebase App Check (consola de Firebase → App Check → Apps → Web).
 * Con ella, Firestore solo acepta peticiones que vienen de la app y no de scripts sueltos. Vacía = desactivado.
 */
export const appCheckSiteKey = '';

/**
 * Clave pública VAPID de Firebase Cloud Messaging (consola de Firebase → Configuración del proyecto → Cloud Messaging →
 * Certificados push web → Generar par de claves). Con ella, los recordatorios llegan aunque Nocta esté cerrada.
 * Vacía = solo avisa la propia app mientras está abierta. No es secreta.
 */
export const vapidKey = '';

/** Build de pruebas contra los emuladores locales de Firebase (VITE_FIREBASE_EMULATOR=1). */
export const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';

export const firebaseConfig = useEmulator
  ? { apiKey: 'demo-key', authDomain: 'demo-nocta.firebaseapp.com', projectId: 'demo-nocta', appId: 'demo' }
  : projectConfig;

/** La app de escritorio (Electron) no puede iniciar sesión con Google, así que allí no hay sincronización. */
export const isDesktopApp = import.meta.env.MODE === 'electron';

export const isConfigured = firebaseConfig.apiKey !== '';

// Configuración del proyecto de Firebase (consola de Firebase → Configuración del proyecto → Tus apps → Web).
// Estos valores no son secretos: identifican el proyecto. Lo que protege los datos son las reglas de firestore.rules.
const projectConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

/** Build de pruebas contra los emuladores locales de Firebase (VITE_FIREBASE_EMULATOR=1). */
export const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';

export const firebaseConfig = useEmulator
  ? { apiKey: 'demo-key', authDomain: 'demo-nocta.firebaseapp.com', projectId: 'demo-nocta', appId: 'demo' }
  : projectConfig;

/** La app de escritorio (Electron) no puede iniciar sesión con Google, así que allí no hay sincronización. */
export const isDesktopApp = import.meta.env.MODE === 'electron';

export const isConfigured = firebaseConfig.apiKey !== '';

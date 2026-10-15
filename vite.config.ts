import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { CHANGELOG } from './src/data/changelog';

// La versión de la app sale de package.json (npm version patch/minor/major).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Content-Security-Policy de la página. GitHub Pages no deja enviar cabeceras, así que va en una <meta>.
 * Web: Firebase (Auth y Firestore en *.googleapis.com), el inicio de sesión de Google (apis.google.com y el
 * iframe de authDomain) y reCAPTCHA para App Check. Escritorio: solo la API de GitHub para el aviso de versión.
 */
function csp(electron: boolean): string {
  const emulator = process.env.VITE_FIREBASE_EMULATOR === '1' ? ' http://127.0.0.1:9099 http://127.0.0.1:8080' : '';
  const rules = electron
    ? {
        'default-src': "'self'",
        'script-src': "'self'",
        'connect-src': "'self' https://api.github.com",
        'frame-src': "'none'",
      }
    : {
        'default-src': "'self'",
        'script-src': "'self' https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
        'connect-src': `'self' https://*.googleapis.com https://apis.google.com${emulator}`,
        // authDomain de src/sync/config.ts: Firebase Auth abre ahí su iframe para el inicio de sesión
        'frame-src': 'https://nocta-5f52e.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/',
        'worker-src': "'self'",
        'manifest-src': "'self'",
      };
  return Object.entries({
    ...rules,
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data:",
    'font-src': "'self'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'none'",
  })
    .map(([k, v]) => `${k} ${v}`)
    .join('; ');
}

// `vite build --mode electron` genera la versión de escritorio: rutas relativas (file://) y sin service worker.
// `vite build --mode pages` genera la web para GitHub Pages, que se sirve en /agenda/.
export default defineConfig(({ mode, command }) => {
  const electron = mode === 'electron';
  // Cada versión que se publica tiene que contar sus novedades (se enseñan al usuario al actualizar).
  if (command === 'build' && !CHANGELOG.some((r) => r.version === version)) {
    throw new Error(
      `Falta la entrada de la versión ${version} en src/data/changelog.ts: añade qué cambia para el usuario antes de compilar.`,
    );
  }
  return {
    base: electron ? './' : mode === 'pages' ? '/agenda/' : '/',
    define: { __APP_VERSION__: JSON.stringify(version) },
    resolve: electron
      ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-stub.ts', import.meta.url)) } }
      : undefined,
    build: { outDir: electron ? 'dist-app' : 'dist' },
    plugins: [
      react(),
      {
        name: 'nocta-csp',
        transformIndexHtml: (html: string) =>
          html.replace(
            '<meta charset="UTF-8" />',
            `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp(electron)}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
          ),
      },
      !electron &&
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg'],
          manifest: {
            name: 'Nocta · Agenda',
            short_name: 'Nocta',
            description: 'Tus deberes y exámenes, sin ruido.',
            lang: 'es',
            theme_color: '#0d0e12',
            background_color: '#0d0e12',
            display: 'standalone',
            icons: [
              { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          },
        }),
    ],
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// `vite build --mode electron` genera la versión de escritorio: rutas relativas (file://) y sin service worker.
// `vite build --mode pages` genera la web para GitHub Pages, que se sirve en /agenda/.
export default defineConfig(({ mode }) => {
  const electron = mode === 'electron';
  return {
    base: electron ? './' : mode === 'pages' ? '/agenda/' : '/',
    resolve: electron
      ? { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./src/pwa-stub.ts', import.meta.url)) } }
      : undefined,
    build: { outDir: electron ? 'dist-app' : 'dist' },
    plugins: [
      react(),
      electron && {
        name: 'nocta-csp',
        transformIndexHtml: (html: string) =>
          html.replace(
            '<meta charset="UTF-8" />',
            `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'" />`,
          ),
      },
      !electron &&
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg'],
          manifest: {
            name: 'Nocta · Agenda 2º DAM',
            short_name: 'Nocta',
            description: 'Deberes y exámenes de 2º DAM, sin ruido.',
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

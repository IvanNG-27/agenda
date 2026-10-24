import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { startSync } from './sync';
import { startUpdateChecks } from './updates';
import { startNotifications } from './notify';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './styles/tokens.css';
import './styles/app.css';

// Dentro de un iframe de otra web la app no arranca (protección contra clickjacking: GitHub Pages no permite
// enviar la cabecera frame-ancestors, y en una <meta> no tiene efecto).
let framed = true;
try {
  framed = window.top !== window.self;
} catch {
  /* acceder a window.top desde otro origen lanza error: también está enmarcada */
}

if (framed) {
  const root = document.getElementById('root')!;
  root.className = 'framed';
  const link = document.createElement('a');
  link.href = location.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Abrir Nocta en una pestaña nueva';
  root.append('Nocta no se puede usar dentro de otra página. ', link);
} else {
  registerSW({ immediate: true });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  startSync();
  startUpdateChecks();
  startNotifications();
}

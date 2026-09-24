// En la app de escritorio no hay service worker: la app ya va empaquetada.
export function registerSW(_options?: unknown) {
  return () => Promise.resolve();
}

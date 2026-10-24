/** Versión de package.json, inyectada por Vite al compilar. */
declare const __APP_VERSION__: string;

/** Puente con la app de escritorio (electron/preload.cjs). Solo existe dentro del .exe. */
interface Window {
  noctaDesktop?: {
    notify(title: string, body: string): void;
    getOpenAtLogin(): Promise<boolean>;
    setOpenAtLogin(on: boolean): Promise<boolean>;
  };
}

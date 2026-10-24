// Proceso principal de la app de escritorio (Electron). Carga la build de Vite desde dist-app/.
// Al cerrar la ventana, Nocta sigue junto al reloj para poder avisar de los recordatorios; se sale desde su icono.
const { app, BrowserWindow, shell, Menu, session, Tray, Notification, ipcMain, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_ID = 'com.ivanng.nocta'; // el mismo que build.appId de package.json
const ICON = path.join(__dirname, '..', 'build', 'icon.png');
// Arrancada por Windows al iniciar sesión: se queda junto al reloj sin abrir la ventana
const startHidden = process.argv.includes('--oculta');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;
let tray;
let quitting = false;

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 560,
    title: 'Nocta',
    backgroundColor: '#0d0e12',
    autoHideMenuBar: true,
    icon: ICON,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadFile(path.join(__dirname, '..', 'dist-app', 'index.html'));
  win.once('ready-to-show', () => {
    if (!startHidden) win.show();
  });

  // Al apagar o cerrar la sesión de Windows la ventana sí se cierra (si no, bloquearía el apagado)
  win.on('query-session-end', () => {
    quitting = true;
  });
  win.on('session-end', () => {
    quitting = true;
  });

  // Cerrar la ventana la oculta: la app sigue junto al reloj para avisar
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
  });

  // Los enlaces externos se abren en el navegador, nunca dentro de la app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('Nocta');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir Nocta', click: showWindow },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', showWindow);
}

/**
 * Windows solo muestra notificaciones de una app que tenga un acceso directo en el menú Inicio con su AppUserModelID.
 * Como Nocta se distribuye en .zip, sin instalador, lo crea ella misma (y lo actualiza si se mueve la carpeta).
 * El desinstalador lo borra porque apunta a la carpeta de la app.
 */
function ensureStartMenuShortcut() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  const link = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Nocta.lnk');
  const options = { target: process.execPath, appUserModelId: APP_ID, description: 'Nocta · Agenda', icon: process.execPath, iconIndex: 0 };
  try {
    const current = fs.existsSync(link) ? shell.readShortcutLink(link) : null;
    if (!current || current.target !== process.execPath || current.appUserModelId !== APP_ID) {
      shell.writeShortcutLink(link, current ? 'replace' : 'create', options);
    }
  } catch {
    /* sin acceso directo las notificaciones pueden no verse, pero la app funciona */
  }
}

// Solo la ventana de la app (cargada desde file://) puede usar estos canales
const fromApp = (e) => (e.senderFrame?.url ?? '').startsWith('file://');

ipcMain.on('nocta:notify', (e, msg) => {
  if (!fromApp(e) || !Notification.isSupported()) return;
  const title = typeof msg?.title === 'string' ? msg.title.slice(0, 150) : 'Nocta';
  const body = typeof msg?.body === 'string' ? msg.body.slice(0, 280) : '';
  const n = new Notification({ title, body, icon: ICON });
  n.on('click', showWindow);
  n.show();
});

const LOGIN_NAME = 'Nocta';
ipcMain.handle('nocta:get-open-at-login', (e) => {
  if (!fromApp(e)) return false;
  return app.getLoginItemSettings({ path: process.execPath, args: ['--oculta'] }).openAtLogin;
});
ipcMain.handle('nocta:set-open-at-login', (e, on) => {
  if (!fromApp(e)) return false;
  app.setLoginItemSettings({ openAtLogin: on === true, path: process.execPath, args: ['--oculta'], name: LOGIN_NAME });
  return app.getLoginItemSettings({ path: process.execPath, args: ['--oculta'] }).openAtLogin;
});

app.on('second-instance', showWindow);
app.on('before-quit', () => {
  quitting = true;
});

app.whenReady().then(() => {
  app.setAppUserModelId(APP_ID);
  // La app no necesita cámara, micrófono, ubicación… : se deniega cualquier permiso. Las notificaciones no pasan
  // por aquí: las muestra este proceso (canal nocta:notify).
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(null);
  ensureStartMenuShortcut();
  createWindow();
  createTray();
  app.on('activate', showWindow);
});

// Con la ventana oculta la app sigue viva junto al reloj; solo se sale desde el icono
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  if (quitting) app.quit();
});

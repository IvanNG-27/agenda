// Puente mínimo entre la interfaz (sin acceso a Node) y el proceso principal: solo lo que necesitan los avisos.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noctaDesktop', {
  notify: (title, body) => ipcRenderer.send('nocta:notify', { title: String(title), body: String(body) }),
  getOpenAtLogin: () => ipcRenderer.invoke('nocta:get-open-at-login'),
  setOpenAtLogin: (on) => ipcRenderer.invoke('nocta:set-open-at-login', on === true),
});

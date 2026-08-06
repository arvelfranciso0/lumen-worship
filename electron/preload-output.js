// Preload for the second-monitor "audience output" window only. Deliberately
// separate from preload.js: OutputWindowApp.tsx is designed to have no
// useLumen/repository access ("deliberately dumb", see its own header
// comment), so this only exposes exactly what it calls — onState and
// notifyReady — never electronAPI (DB CRUD), electronShell, electronCompat,
// or electronUpdater. If this window's renderer content is ever compromised
// (XSS, a future code change, a supply-chain-compromised dependency), it
// gets none of the operator window's privileged capabilities.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronDisplay", {
  onState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("output:state", handler);
    return () => ipcRenderer.removeListener("output:state", handler);
  },
  notifyReady: () => ipcRenderer.send("output:ready"),
});

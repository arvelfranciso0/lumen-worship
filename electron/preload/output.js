// Preload for the output window; exposes only onState and notifyReady.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronDisplay", {
  onState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("output:state", handler);
    return () => ipcRenderer.removeListener("output:state", handler);
  },
  notifyReady: () => ipcRenderer.send("output:ready"),
});

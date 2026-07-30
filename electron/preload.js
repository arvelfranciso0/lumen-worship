// Exposes a typed window.electronAPI surface to the renderer, matching the
// AppRepository interface exactly (see lib/repository/types.ts) so
// lib/repository/electron.ts can call it as a plain pass-through.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  loadAll: () => ipcRenderer.invoke("repo:loadAll"),
  upsertSong: (song) => ipcRenderer.invoke("repo:upsertSong", song),
  deleteSong: (id) => ipcRenderer.invoke("repo:deleteSong", id),
  upsertLineup: (lineup) => ipcRenderer.invoke("repo:upsertLineup", lineup),
  deleteLineup: (id) => ipcRenderer.invoke("repo:deleteLineup", id),
  setSongOverride: (songId, sections) => ipcRenderer.invoke("repo:setSongOverride", songId, sections),
  setPrefs: (patch) => ipcRenderer.invoke("repo:setPrefs", patch),
  addBackground: (input) => ipcRenderer.invoke("repo:addBackground", input),
  deleteBackground: (id) => ipcRenderer.invoke("repo:deleteBackground", id),
  addBibleTranslation: (input) => ipcRenderer.invoke("repo:addBibleTranslation", input),
  deleteBibleTranslation: (code) => ipcRenderer.invoke("repo:deleteBibleTranslation", code),
  getBibleTranslationData: (code) => ipcRenderer.invoke("repo:getBibleTranslationData", code),
});

// Separate bridge for the second-monitor "audience output" feature — kept
// apart from electronAPI above since that one is treated as a 1:1
// AppRepository implementation (lib/repository/electron.ts spreads it
// directly), and mixing window-management calls into it would break that.
contextBridge.exposeInMainWorld("electronDisplay", {
  list: () => ipcRenderer.invoke("display:list"),
  getStatus: () => ipcRenderer.invoke("display:status"),
  onStatusChanged: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("output:status", handler);
    return () => ipcRenderer.removeListener("output:status", handler);
  },
  openOutput: (displayId) => ipcRenderer.invoke("output:open", displayId),
  closeOutput: () => ipcRenderer.invoke("output:close"),
  sendState: (payload) => ipcRenderer.send("output:state", payload),
  onState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("output:state", handler);
    return () => ipcRenderer.removeListener("output:state", handler);
  },
  notifyReady: () => ipcRenderer.send("output:ready"),
});

// A tiny, separate bridge (see components/lumen/electronShell.ts) for the one
// OS-shell action Lumen needs: opening a URL in the user's real system
// browser (the Bible-translation download page) rather than navigating the
// app window itself.
contextBridge.exposeInMainWorld("electronShell", {
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});

// Bridge for the header's update-notification bell (see
// components/lumen/electronUpdater.ts) — surfaces electron-updater's status
// (checking/available/downloading/downloaded/error) to the renderer and lets
// it trigger the quit-and-install step once a download has finished.
contextBridge.exposeInMainWorld("electronUpdater", {
  getStatus: () => ipcRenderer.invoke("update:status"),
  onStatusChanged: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("update:status", handler);
    return () => ipcRenderer.removeListener("update:status", handler);
  },
  installUpdate: () => ipcRenderer.invoke("update:install"),
});

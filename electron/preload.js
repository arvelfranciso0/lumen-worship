// Exposes a typed window.electronAPI surface to the renderer, matching the
// AppRepository interface exactly (see lib/repository/types.ts) so
// lib/repository/electron.ts can call it as a plain pass-through.

const { contextBridge, ipcRenderer } = require("electron");
const { parseBibleXml } = require("./bibleXml.js");

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
  // db.js's getBibleTranslationData returns raw { text, format } (no
  // parsing) — the actual JSON.parse/parseBibleXml happens here, in the
  // preload script's own isolated renderer context, not the main process,
  // so parsing a multi-MB translation never blocks IPC for other windows
  // (notably the second-monitor audience output).
  getBibleTranslationData: (code) => ipcRenderer.invoke("repo:getBibleTranslationData", code).then(
    (raw) => raw ? (raw.format === "xml" ? parseBibleXml(raw.text) : JSON.parse(raw.text)) : null
  ),
  setSongMetaOverride: (songId, patch) => ipcRenderer.invoke("repo:setSongMetaOverride", songId, patch),
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
  setOperatorFullScreen: (fullScreen) => ipcRenderer.invoke("window:setFullScreen", fullScreen),
});

// A tiny, separate bridge (see components/lumen/electronShell.ts) for the one
// OS-shell action Lumen needs: opening a URL in the user's real system
// browser (the Bible-translation download page) rather than navigating the
// app window itself.
contextBridge.exposeInMainWorld("electronShell", {
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});

// Bridge for the Settings "Compatibility mode" toggle (see
// components/lumen/electronCompat.ts) — disables GPU acceleration, an escape
// hatch for the rare machine that can't run Chromium's GPU process reliably.
// Off by default; the change only takes effect after a restart, since
// acceleration can only be disabled before app.ready.
contextBridge.exposeInMainWorld("electronCompat", {
  getGpuAccelerationDisabled: () => ipcRenderer.invoke("compat:getGpuAccelerationDisabled"),
  setGpuAccelerationDisabled: (disabled) => ipcRenderer.invoke("compat:setGpuAccelerationDisabled", disabled),
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
  setAutoUpdateEnabled: (enabled) => ipcRenderer.invoke("update:setAutoUpdateEnabled", enabled),
});

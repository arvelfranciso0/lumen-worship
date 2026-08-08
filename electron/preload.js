// Exposes window.electronAPI, matching the AppRepository interface.

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
  // Parses the raw translation data returned by the main process.
  getBibleTranslationData: (code) => ipcRenderer.invoke("repo:getBibleTranslationData", code).then(
    (raw) => raw ? (raw.format === "xml" ? parseBibleXml(raw.text) : JSON.parse(raw.text)) : null
  ),
  setSongMetaOverride: (songId, patch) => ipcRenderer.invoke("repo:setSongMetaOverride", songId, patch),
});

// Exposes window.electronDisplay for the second-monitor output feature.
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

// Exposes window.electronShell for opening URLs in the system browser.
contextBridge.exposeInMainWorld("electronShell", {
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});

// Exposes window.electronCompat for the GPU-acceleration compatibility toggle.
contextBridge.exposeInMainWorld("electronCompat", {
  getGpuAccelerationDisabled: () => ipcRenderer.invoke("compat:getGpuAccelerationDisabled"),
  setGpuAccelerationDisabled: (disabled) => ipcRenderer.invoke("compat:setGpuAccelerationDisabled", disabled),
});

// Exposes window.electronUpdater for update status and install control.
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

// IPC channel registration for the operator window.

const fs = require("node:fs");
const { ipcMain, shell } = require("electron");

function registerIpcHandlers({ db, getOperatorWindow, gpuCompatFlagPath, gpuAccelerationDisabled, updater, outputWindowManager }) {
  ipcMain.handle("repo:loadAll", () => db.loadAll());
  ipcMain.handle("repo:upsertSong", (_event, song) => db.upsertSong(song));
  ipcMain.handle("repo:deleteSong", (_event, id) => db.deleteSong(id));
  ipcMain.handle("repo:upsertLineup", (_event, lineup) => db.upsertLineup(lineup));
  ipcMain.handle("repo:deleteLineup", (_event, id) => db.deleteLineup(id));
  ipcMain.handle("repo:setSongOverride", (_event, songId, sections) => db.setSongOverride(songId, sections));
  ipcMain.handle("repo:setPrefs", (_event, patch) => db.setPrefs(patch));
  ipcMain.handle("repo:addBackground", (_event, input) => db.addBackground(input));
  ipcMain.handle("repo:deleteBackground", (_event, id) => db.deleteBackground(id));
  ipcMain.handle("repo:addBibleTranslation", (_event, input) => db.addBibleTranslation(input));
  ipcMain.handle("repo:deleteBibleTranslation", (_event, code) => db.deleteBibleTranslation(code));
  ipcMain.handle("repo:getBibleTranslationData", (_event, code) => db.getBibleTranslationData(code));
  ipcMain.handle("repo:setSongMetaOverride", (_event, songId, patch) => db.setSongMetaOverride(songId, patch));

  // Only allows http(s) URLs to be opened.
  ipcMain.handle("shell:openExternal", (_event, url) => {
    if (!/^https?:\/\//i.test(url)) return;
    return shell.openExternal(url);
  });

  ipcMain.handle("display:list", () => outputWindowManager.listDisplays());
  ipcMain.handle("display:status", () => outputWindowManager.outputStatusPayload());

  // Toggles OS-level fullscreen for the operator window.
  ipcMain.handle("window:setFullScreen", (_event, fullScreen) => {
    const operatorWindow = getOperatorWindow();
    if (operatorWindow && !operatorWindow.isDestroyed()) operatorWindow.setFullScreen(fullScreen);
  });

  // Reads/writes the GPU-acceleration compatibility flag; takes effect after restart.
  ipcMain.handle("compat:getGpuAccelerationDisabled", () => gpuAccelerationDisabled);
  ipcMain.handle("compat:setGpuAccelerationDisabled", (_event, disabled) => {
    if (disabled) fs.writeFileSync(gpuCompatFlagPath, "");
    else { try { fs.unlinkSync(gpuCompatFlagPath); } catch { /* already absent */ } }
  });

  ipcMain.handle("update:status", () => updater.getStatus());
  // Installs the downloaded update and restarts the app.
  ipcMain.handle("update:install", () => updater.install());
  ipcMain.handle("update:setAutoUpdateEnabled", (_event, enabled) => updater.setAutoUpdateEnabled(enabled));

  ipcMain.handle("output:open", (_event, displayId) => outputWindowManager.open(displayId));
  ipcMain.handle("output:close", () => outputWindowManager.close());

  ipcMain.on("output:state", (event, payload) => outputWindowManager.pushState(event, payload));
  ipcMain.on("output:ready", (event) => outputWindowManager.handleReady(event));
}

module.exports = { registerIpcHandlers };

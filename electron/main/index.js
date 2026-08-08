const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, screen } = require("electron");
const { createDb } = require("../db/index.js");
const { resolveAppUrl, closeStaticServer } = require("./staticServer.js");
const { createOutputWindowManager } = require("./outputWindow.js");
const { createUpdater } = require("./updater.js");
const { registerMediaProtocolScheme, registerMediaProtocolHandler } = require("./mediaProtocol.js");
const { registerIpcHandlers } = require("./ipcHandlers.js");

let db;
let operatorWindow;

const getOperatorWindow = () => operatorWindow;

const updater = createUpdater({ getOperatorWindow });
const outputWindowManager = createOutputWindowManager({ getOperatorWindow, resolveAppUrl });

// Reads the GPU-acceleration compatibility flag from a marker file before app.ready.
const gpuCompatFlagPath = path.join(app.getPath("userData"), "disable-gpu-acceleration");
const gpuAccelerationDisabled = fs.existsSync(gpuCompatFlagPath);
if (gpuAccelerationDisabled) app.disableHardwareAcceleration();

registerMediaProtocolScheme();

async function createWindow() {
  operatorWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, "..", "..", "public", "lumen.ico"),
    // Hides the menu bar without removing it, so text-input accelerators still work.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Disabled so preload/index.js can require its sibling bibleXml.js module.
      sandbox: false,
    },
  });
  operatorWindow.loadURL(await resolveAppUrl());
  operatorWindow.on("closed", () => {
    operatorWindow = null;
    // Closes the output window when the operator window closes.
    outputWindowManager.close();
  });
}

app.whenReady().then(() => {
  db = createDb(path.join(app.getPath("userData"), "lumen.db"));
  const persistedAutoUpdatePref = db.loadAll().prefs.autoUpdateEnabled;
  if (typeof persistedAutoUpdatePref === "boolean") updater.setPersistedAutoUpdateEnabled(persistedAutoUpdatePref);

  const backgroundsDir = path.join(app.getPath("userData"), "backgrounds");
  registerMediaProtocolHandler(backgroundsDir);

  registerIpcHandlers({ db, getOperatorWindow, gpuCompatFlagPath, gpuAccelerationDisabled, updater, outputWindowManager });
  createWindow();
  // Checks for updates only in packaged builds.
  updater.checkForUpdatesIfEnabled();

  screen.on("display-added", outputWindowManager.handleDisplaysChanged);
  screen.on("display-removed", outputWindowManager.handleDisplayRemoved);
  screen.on("display-metrics-changed", outputWindowManager.handleDisplaysChanged);

  app.on("activate", () => {
    if (!operatorWindow || operatorWindow.isDestroyed()) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (db) db.close();
  closeStaticServer();
});

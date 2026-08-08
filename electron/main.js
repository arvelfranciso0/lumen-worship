const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, ipcMain, protocol, net, screen, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { createDb } = require("./db.js");

let db;
let staticServer;
let operatorWindow;
let outputWindow = null;
// The most recent payload pushed via output:state, replayed once the output window loads.
let lastOutputStatePayload = null;
let updateStatus = { status: "idle" };
// Whether auto-update checks are enabled; defaults to off until prefs load.
let autoUpdateEnabled = false;
let hasCheckedForUpdate = false;

// Returns null if the resolved path escapes dir.
function resolveWithinDir(dir, fileName) {
  const resolvedDir = path.resolve(dir);
  const resolved = path.resolve(dir, fileName);
  if (resolved !== resolvedDir && !resolved.startsWith(resolvedDir + path.sep)) return null;
  return resolved;
}

function checkForUpdatesIfEnabled() {
  if (!app.isPackaged || !autoUpdateEnabled || hasCheckedForUpdate) return;
  hasCheckedForUpdate = true;
  autoUpdater.checkForUpdatesAndNotify();
}

// Updates the current update status and notifies the operator window.
function setUpdateStatus(next) {
  updateStatus = next;
  if (operatorWindow && !operatorWindow.isDestroyed()) {
    operatorWindow.webContents.send("update:status", updateStatus);
  }
}

// Normalizes releaseNotes to a single string.
function normalizeReleaseNotes(releaseNotes) {
  if (typeof releaseNotes === "string") return releaseNotes;
  if (Array.isArray(releaseNotes) && releaseNotes.length > 0) return releaseNotes[0].note;
  return null;
}

autoUpdater.on("checking-for-update", () => setUpdateStatus({ status: "checking" }));
autoUpdater.on("update-not-available", () => setUpdateStatus({ status: "idle" }));
autoUpdater.on("update-available", (info) => setUpdateStatus({ status: "available", version: info.version, releaseNotes: normalizeReleaseNotes(info.releaseNotes) }));
autoUpdater.on("download-progress", (progress) => setUpdateStatus({ status: "downloading", percent: progress.percent }));
autoUpdater.on("update-downloaded", (info) => setUpdateStatus({ status: "downloaded", version: info.version, releaseNotes: normalizeReleaseNotes(info.releaseNotes) }));
autoUpdater.on("error", (error) => setUpdateStatus({ status: "error", error: error.message }));
// Which display the output window uses; "auto" picks the first non-primary display.
let selectedOutputDisplayId = "auto";

// Reads the GPU-acceleration compatibility flag from a marker file before app.ready.
const gpuCompatFlagPath = path.join(app.getPath("userData"), "disable-gpu-acceleration");
const gpuAccelerationDisabled = fs.existsSync(gpuCompatFlagPath);
if (gpuAccelerationDisabled) app.disableHardwareAcceleration();

// Registers the lumen-media scheme for serving uploaded background files.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "lumen-media",
    // Required for crossOrigin="anonymous" video loads to succeed.
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
]);

const MIME_TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".txt": "text/plain", ".xml": "application/xml",
};

// Serves the static export over a local HTTP server.
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const filePath = path.join(rootDir, urlPath === "/" ? "index.html" : urlPath);
      // Rejects paths outside rootDir.
      if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(rootDir, "404.html"), (err2, data2) => {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end(err2 ? "Not found" : data2);
          });
          return;
        }
        res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function ensureStaticServer() {
  if (app.isPackaged && !staticServer) staticServer = await startStaticServer(path.join(__dirname, "..", "out"));
  return staticServer;
}

async function resolveAppUrl(query) {
  if (app.isPackaged) {
    const server = await ensureStaticServer();
    const { port } = server.address();
    return `http://127.0.0.1:${port}/${query ? "?" + query : ""}`;
  }
  return `http://localhost:3000/${query ? "?" + query : ""}`;
}

async function createWindow() {
  operatorWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, "..", "public", "lumen.ico"),
    // Hides the menu bar without removing it, so text-input accelerators still work.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Disabled so preload.js can require its sibling bibleXml.js module.
      sandbox: false,
    },
  });
  operatorWindow.loadURL(await resolveAppUrl());
  operatorWindow.on("closed", () => {
    operatorWindow = null;
    // Closes the output window when the operator window closes.
    closeOutputWindow();
  });
}

// ---- Display detection + the fullscreen "audience" output window ----

function serializeDisplay(display) {
  const primaryId = screen.getPrimaryDisplay().id;
  return {
    id: display.id,
    label: display.size.width + "×" + display.size.height + (display.id === primaryId ? " (Primary)" : ""),
    width: display.size.width,
    height: display.size.height,
    x: display.bounds.x,
    y: display.bounds.y,
    isPrimary: display.id === primaryId,
  };
}

function listDisplays() {
  return screen.getAllDisplays().map(serializeDisplay);
}

function pickAutoDisplay() {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  return displays.find((d) => d.id !== primaryId) || null;
}

function resolveOutputDisplay() {
  if (selectedOutputDisplayId !== "auto") {
    const match = screen.getAllDisplays().find((d) => d.id === selectedOutputDisplayId);
    if (match) return match;
  }
  return pickAutoDisplay();
}

function outputStatusPayload() {
  const display = resolveOutputDisplay();
  return {
    active: !!(outputWindow && !outputWindow.isDestroyed()),
    selectedDisplayId: selectedOutputDisplayId,
    display: display ? serializeDisplay(display) : null,
    displays: listDisplays(),
  };
}

function broadcastOutputStatus() {
  if (operatorWindow && !operatorWindow.isDestroyed()) {
    operatorWindow.webContents.send("output:status", outputStatusPayload());
  }
}

async function openOutputWindow() {
  console.log("[output] openOutputWindow() called; all displays:", listDisplays());
  const display = resolveOutputDisplay();
  if (!display) {
    console.log("[output] no secondary display resolved, bailing out");
    return { ok: false, reason: "no-secondary-display" };
  }
  console.log("[output] opening on display", display.id, display.bounds);

  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.setFullScreen(false);
    outputWindow.setBounds(display.bounds);
    outputWindow.setFullScreen(true);
    outputWindow.show();
    broadcastOutputStatus();
    return { ok: true };
  }

  const win = new BrowserWindow({
    x: display.bounds.x, y: display.bounds.y, width: display.bounds.width, height: display.bounds.height,
    frame: false, show: false, autoHideMenuBar: true, backgroundColor: "#000000", skipTaskbar: true,
    webPreferences: {
      // Uses its own minimal preload rather than the operator's, so this window gets no privileged APIs.
      preload: path.join(__dirname, "preload-output.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Kept consistent with the operator window's sandbox setting.
      sandbox: false,
    },
  });
  outputWindow = win;
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[output] window failed to load:", errorCode, errorDescription);
  });
  win.webContents.on("did-finish-load", () => {
    console.log("[output] page finished loading, waiting for output:ready…");
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[output] renderer process gone:", details.reason);
  });
  win.on("closed", () => {
    console.log("[output] window closed");
    if (outputWindow === win) outputWindow = null;
    broadcastOutputStatus();
  });
  // Broadcasts status immediately, before the page finishes loading.
  broadcastOutputStatus();
  win.loadURL(await resolveAppUrl("output=1"));
  // Stays hidden until output:ready confirms the page has rendered.
  return { ok: true };
}

function closeOutputWindow() {
  if (outputWindow && !outputWindow.isDestroyed()) outputWindow.close();
  outputWindow = null;
  broadcastOutputStatus();
}

// Re-bounds the output window only if its target bounds changed.
function retargetOutputWindow() {
  if (!outputWindow || outputWindow.isDestroyed()) return;
  const display = resolveOutputDisplay();
  if (!display) return;
  const current = outputWindow.getBounds();
  const target = display.bounds;
  if (current.x === target.x && current.y === target.y && current.width === target.width && current.height === target.height) return;
  outputWindow.setFullScreen(false);
  outputWindow.setBounds(target);
  outputWindow.setFullScreen(true);
}

// Closes the output window only when its display was actually removed.
function handleDisplayRemoved() {
  if (outputWindow && !outputWindow.isDestroyed() && !resolveOutputDisplay()) {
    closeOutputWindow();
    return;
  }
  retargetOutputWindow();
  broadcastOutputStatus();
}

function handleDisplaysChanged() {
  retargetOutputWindow();
  broadcastOutputStatus();
}

app.whenReady().then(() => {
  db = createDb(path.join(app.getPath("userData"), "lumen.db"));
  const persistedAutoUpdatePref = db.loadAll().prefs.autoUpdateEnabled;
  if (typeof persistedAutoUpdatePref === "boolean") autoUpdateEnabled = persistedAutoUpdatePref;

  const backgroundsDir = path.join(app.getPath("userData"), "backgrounds");
  protocol.handle("lumen-media", async (request) => {
    // Extracts the filename from the request URL's pathname.
    const fileName = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ""));
    // Rejects a resolved path that escapes backgroundsDir.
    const resolvedPath = resolveWithinDir(backgroundsDir, fileName);
    if (!resolvedPath) return new Response(null, { status: 403 });
    const response = await net.fetch(pathToFileURL(resolvedPath).toString());
    // Adds a permissive CORS header to the response.
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  });

  registerIpcHandlers();
  createWindow();
  // Checks for updates only in packaged builds.
  checkForUpdatesIfEnabled();

  screen.on("display-added", handleDisplaysChanged);
  screen.on("display-removed", handleDisplayRemoved);
  screen.on("display-metrics-changed", handleDisplaysChanged);

  app.on("activate", () => {
    if (!operatorWindow || operatorWindow.isDestroyed()) createWindow();
  });
});

function registerIpcHandlers() {
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

  ipcMain.handle("display:list", () => listDisplays());
  ipcMain.handle("display:status", () => outputStatusPayload());

  // Toggles OS-level fullscreen for the operator window.
  ipcMain.handle("window:setFullScreen", (_event, fullScreen) => {
    if (operatorWindow && !operatorWindow.isDestroyed()) operatorWindow.setFullScreen(fullScreen);
  });

  // Reads/writes the GPU-acceleration compatibility flag; takes effect after restart.
  ipcMain.handle("compat:getGpuAccelerationDisabled", () => gpuAccelerationDisabled);
  ipcMain.handle("compat:setGpuAccelerationDisabled", (_event, disabled) => {
    if (disabled) fs.writeFileSync(gpuCompatFlagPath, "");
    else { try { fs.unlinkSync(gpuCompatFlagPath); } catch { /* already absent */ } }
  });

  ipcMain.handle("update:status", () => updateStatus);
  // Installs the downloaded update and restarts the app.
  ipcMain.handle("update:install", () => autoUpdater.quitAndInstall());
  ipcMain.handle("update:setAutoUpdateEnabled", (_event, enabled) => {
    autoUpdateEnabled = enabled;
    // Checks for updates immediately after enabling auto-update.
    checkForUpdatesIfEnabled();
  });

  ipcMain.handle("output:open", async (_event, displayId) => {
    selectedOutputDisplayId = displayId ?? "auto";
    return openOutputWindow();
  });
  ipcMain.handle("output:close", () => {
    closeOutputWindow();
    return { ok: true };
  });

  // Relays the operator's live state to the output window.
  ipcMain.on("output:state", (event, payload) => {
    // Ignores state pushes from any window other than the operator.
    if (BrowserWindow.fromWebContents(event.sender) !== operatorWindow) return;
    lastOutputStatePayload = payload;
    if (outputWindow && !outputWindow.isDestroyed()) outputWindow.webContents.send("output:state", payload);
  });

  // Reveals the output window once it signals it has rendered.
  ipcMain.on("output:ready", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    console.log("[output] output:ready received; is the tracked output window?", win === outputWindow);
    if (win !== outputWindow || win.isDestroyed()) return;
    // Replays the last pushed state before showing the window.
    if (lastOutputStatePayload) win.webContents.send("output:state", lastOutputStatePayload);
    const display = resolveOutputDisplay();
    if (display) win.setBounds(display.bounds);
    win.setFullScreen(true);
    win.show();
    console.log("[output] window shown on", display?.bounds);
    broadcastOutputStatus();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (db) db.close();
  if (staticServer) staticServer.close();
});

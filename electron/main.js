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
// The most recent payload the operator pushed via output:state, kept here
// (not just relayed) so it can be replayed once the output window actually
// finishes loading — see the output:ready handler below for why the very
// first push otherwise never reaches it.
let lastOutputStatePayload = null;
let updateStatus = { status: "idle" };
// Defaults to off (opt-in) until the DB's persisted prefs say otherwise —
// read directly from db.loadAll() in app.whenReady, since the main process
// already owns the SQLite connection and doesn't need to round-trip through
// the renderer just to know this before deciding whether to check on launch.
let autoUpdateEnabled = false;
let hasCheckedForUpdate = false;

// Defense-in-depth containment check, mirroring db.js's resolveWithinDir:
// path.join already normalizes literal ".."/"." segments, but this catches
// anything that reaches it pre-resolved to escape dir anyway (belt-and-
// suspenders against the next handler added here forgetting to normalize).
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

// Tracked here (not just fired as one-off IPC events) so a freshly opened/
// reloaded operator window can ask for the current status instead of only
// ever seeing whichever event happened to fire while nothing was listening.
function setUpdateStatus(next) {
  updateStatus = next;
  if (operatorWindow && !operatorWindow.isDestroyed()) {
    operatorWindow.webContents.send("update:status", updateStatus);
  }
}

// electron-updater's releaseNotes can be a plain string or (only when
// fullChangelog is enabled, which it isn't here) an array of per-version
// {version, note} entries — normalized to a single string either way so the
// renderer only ever deals with one shape.
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
// "auto" picks the first non-primary display; a number pins to that specific
// display's id. Persisted through the same generic prefs mechanism as any
// other setting (see repo:setPrefs), keyed as outputDisplayId.
let selectedOutputDisplayId = "auto";

// Some machines (VMs, remote-desktop sessions, flaky GPU drivers) can't run
// Chromium's GPU process reliably — it crash-loops, the compositor can never
// paint a frame, and the window shows blank even though the page underneath
// loaded fine. Disabling hardware acceleration avoids that, but forces
// software rendering for every window, which is dramatically slower on
// low-spec hardware (most visibly as lag between clicking a slide and it
// appearing on the audience screen). So this is opt-in — off by default,
// toggled from Settings as "Compatibility mode" for the rare machine that
// actually needs it — rather than punishing everyone else's paint
// performance for a workaround most people don't need. Must be read/called
// before app.ready, so this can't wait for the SQLite db (only opened in
// app.whenReady below) — a plain marker file is checked instead.
const gpuCompatFlagPath = path.join(app.getPath("userData"), "disable-gpu-acceleration");
const gpuAccelerationDisabled = fs.existsSync(gpuCompatFlagPath);
if (gpuAccelerationDisabled) app.disableHardwareAcceleration();

// Serves uploaded background images/video from userData/backgrounds/ back to
// the renderer. Registered before app.ready, as Electron requires. A raw
// file:// path is avoided here since it's unreliable under contextIsolation.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "lumen-media",
    // corsEnabled is required for crossOrigin="anonymous" (see
    // generateVideoPoster in useLumen.ts) to work at all — without it,
    // Chromium refuses the cross-origin video load outright (an "error"
    // event, load never even reaches the handler's response) regardless of
    // the Access-Control-Allow-Origin header the handler below sends back.
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
]);

const MIME_TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".txt": "text/plain", ".xml": "application/xml",
};

// Next's static export uses absolute asset paths (/_next/...), which break
// under a raw file:// load. Serving the exported build over a local HTTP
// server (same-origin, absolute paths resolve correctly) avoids that.
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const filePath = path.join(rootDir, urlPath === "/" ? "index.html" : urlPath);
      // A trailing separator is required in the prefix check — otherwise a
      // sibling directory whose name merely starts with rootDir's characters
      // (e.g. "out-evil" next to "out") would incorrectly pass.
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
    // Hides the default File/Edit/View/Window/Help menu bar strip (this app
    // has an entirely custom UI and never uses it) without actually removing
    // the underlying Menu — setApplicationMenu(null) would also silently
    // kill the OS-provided Ctrl+C/V/X/A accelerators in text inputs on
    // Windows/Linux, since those are normally supplied by the default Edit
    // menu's roles, not by Chromium itself. Alt still reveals it if ever
    // needed.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Electron sandboxes preload scripts by default (since v20) — under
      // that sandbox, preload's require() only resolves a small built-in
      // allowlist ('electron', 'events', ...), not arbitrary project files.
      // preload.js requires ./bibleXml.js directly (see that file's own
      // header comment on why), which silently crashed the entire preload
      // script under the sandbox default — meaning NONE of its
      // contextBridge.exposeInMainWorld calls ever ran, not just the Bible
      // one: electronAPI, electronDisplay (the second-monitor bridge),
      // electronShell, electronCompat, electronUpdater were all missing from
      // the renderer. contextIsolation/nodeIntegration above already keep
      // the page itself sandboxed from Node; this only restores the
      // preload's own ability to require its sibling file.
      sandbox: false,
    },
  });
  operatorWindow.loadURL(await resolveAppUrl());
  operatorWindow.on("closed", () => {
    operatorWindow = null;
    // Without this, closing just the operator window leaves outputWindow
    // open on the second monitor — window-all-closed only fires once every
    // BrowserWindow is gone, so the app would never actually quit and the
    // audience screen would keep showing the last slide indefinitely.
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
      // Deliberately its own minimal preload, NOT the operator's preload.js —
      // see preload-output.js's header comment. Exposing the full
      // electronAPI/electronShell/electronCompat/electronUpdater surface here
      // would hand this window (untrusted relative to the operator window: it
      // only ever renders pushed state, never runs operator input) the same
      // DB read/write/delete and update-install capability as the operator.
      preload: path.join(__dirname, "preload-output.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // See the same option on operatorWindow's webPreferences above for why
      // this is required — sandboxed preload can't require() bibleXml.js.
      // preload-output.js doesn't need that file, but sandbox is kept
      // consistent with the operator window either way.
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
  // Broadcast right away so the operator UI reflects "active" as soon as the
  // window exists, rather than only after the page inside it finishes
  // loading (loadURL below can take a moment on a cold dev server).
  broadcastOutputStatus();
  win.loadURL(await resolveAppUrl("output=1"));
  // Held hidden until the output-only page confirms (via output:ready) that
  // it has actually rendered live content — otherwise the operator's full
  // UI would flash on the audience screen for an instant before it swaps in.
  return { ok: true };
}

function closeOutputWindow() {
  if (outputWindow && !outputWindow.isDestroyed()) outputWindow.close();
  outputWindow = null;
  broadcastOutputStatus();
}

// Re-bounds the output window to wherever it should currently be, but only
// if that's actually different from where it already is — Windows fires
// display-metrics-changed when a fullscreen window hides the taskbar, so
// unconditionally calling setFullScreen/setBounds here on every event would
// re-trigger the very same event, feeding back into itself.
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

// Only a genuine display-removed means the output window's monitor might be
// gone — display-metrics-changed also fires from our own setFullScreen()
// calls (see retargetOutputWindow above) and must never be treated as a
// disconnect, or the output window would close itself moments after opening.
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
    // Parse with the real URL class rather than a string replace — the
    // filename lives in the pathname (see db.js's rowToBackground), which
    // is exempt from the host-normalization Chromium applies to standard
    // schemes' authority component.
    const fileName = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ""));
    // Percent-encoding both the dots and slashes in fileName (e.g.
    // "%2e%2e%2F...") survives the URL parser's dot-segment collapsing as an
    // opaque path segment, and the decodeURIComponent above then reconstitutes
    // a literal "../" sequence — resolveWithinDir catches that before the
    // file is ever read, rather than trusting path.join alone.
    const resolvedPath = resolveWithinDir(backgroundsDir, fileName);
    if (!resolvedPath) return new Response(null, { status: 403 });
    const response = await net.fetch(pathToFileURL(resolvedPath).toString());
    // A plain file:// fetch carries no CORS headers, so a <video> loaded
    // from this (cross-origin, relative to the http:// page) protocol
    // taints any canvas it's drawn to — which breaks poster-frame capture
    // (canvas.toDataURL throws SecurityError). Explicitly allowing it here
    // is safe: it only affects code that opts into CORS via
    // crossOrigin="anonymous" (see generateVideoPoster in useLumen.ts),
    // normal <img>/<video> playback is unaffected either way.
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  });

  registerIpcHandlers();
  createWindow();
  // Only meaningful in a packaged build published to GitHub releases — a
  // dev run has no update feed to check against.
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

  // Only http(s) URLs are ever passed here — the caller always uses the
  // hardcoded BIBLE_DOWNLOADS_URL constant, never user-supplied input — but
  // the check costs nothing and keeps this handler from ever being a general
  // arbitrary-protocol-launcher if that assumption changes later.
  ipcMain.handle("shell:openExternal", (_event, url) => {
    if (!/^https?:\/\//i.test(url)) return;
    return shell.openExternal(url);
  });

  ipcMain.handle("display:list", () => listDisplays());
  ipcMain.handle("display:status", () => outputStatusPayload());

  // Real OS-level fullscreen for the operator window — used only for the
  // single-monitor "Present" fallback (see useLumen.ts's startPresenting);
  // when a second display handles the audience view instead, this is never
  // called and the operator's own window stays a normal window.
  ipcMain.handle("window:setFullScreen", (_event, fullScreen) => {
    if (operatorWindow && !operatorWindow.isDestroyed()) operatorWindow.setFullScreen(fullScreen);
  });

  // Compatibility mode (disables GPU acceleration) — see the comment above
  // gpuCompatFlagPath. Always reflects the flag file already read at launch;
  // toggling only takes effect after a restart, since acceleration can only
  // be disabled before app.ready.
  ipcMain.handle("compat:getGpuAccelerationDisabled", () => gpuAccelerationDisabled);
  ipcMain.handle("compat:setGpuAccelerationDisabled", (_event, disabled) => {
    if (disabled) fs.writeFileSync(gpuCompatFlagPath, "");
    else { try { fs.unlinkSync(gpuCompatFlagPath); } catch { /* already absent */ } }
  });

  ipcMain.handle("update:status", () => updateStatus);
  // Only meaningful once updateStatus.status is "downloaded" — quitAndInstall
  // is a no-op (electron-updater just resolves/ignores it) otherwise.
  ipcMain.handle("update:install", () => autoUpdater.quitAndInstall());
  ipcMain.handle("update:setAutoUpdateEnabled", (_event, enabled) => {
    autoUpdateEnabled = enabled;
    // Flipped on mid-session (rather than at next launch) — run the check
    // now instead of making the user restart the app to benefit from it.
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

  // One-way, high-frequency: the operator window pushes the current live
  // slide/style/background on every change; relayed straight through to
  // whichever window is the audience output, if one is open.
  ipcMain.on("output:state", (event, payload) => {
    // Only the operator window ever legitimately pushes state — matters more
    // now that a payload is cached and replayed on every future output:ready
    // (e.g. an output-window reload), not just relayed once.
    if (BrowserWindow.fromWebContents(event.sender) !== operatorWindow) return;
    lastOutputStatePayload = payload;
    if (outputWindow && !outputWindow.isDestroyed()) outputWindow.webContents.send("output:state", payload);
  });

  // The output-only page pings this once it has actually painted real
  // content, only then is it revealed — avoids a flash of the operator UI
  // on the audience screen while the page loads and reads ?output=1.
  ipcMain.on("output:ready", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    console.log("[output] output:ready received; is the tracked output window?", win === outputWindow);
    if (win !== outputWindow || win.isDestroyed()) return;
    // Replay the last state the operator pushed, if any — output:state events
    // sent by useLumen while this window was still loading (the operator's
    // push effect fires as soon as outputStatus.active flips true, which
    // openOutputWindow() broadcasts immediately on window creation, well
    // before loadURL resolves and OutputWindowApp's listener exists) were
    // dispatched to a webContents with nobody listening yet and are gone for
    // good. Without this, the window sits on OutputWindowApp's black default
    // state until the next unrelated live-slide change happens to fire the
    // push effect again. Sent before setFullScreen/show so the window is
    // already showing the real background the instant it becomes visible.
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

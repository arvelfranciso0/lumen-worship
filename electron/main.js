const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, ipcMain, protocol, net, screen } = require("electron");
const { createDb } = require("./db.js");

let db;
let staticServer;
let operatorWindow;
let outputWindow = null;
// "auto" picks the first non-primary display; a number pins to that specific
// display's id. Persisted through the same generic prefs mechanism as any
// other setting (see repo:setPrefs), keyed as outputDisplayId.
let selectedOutputDisplayId = "auto";

// Some machines (VMs, remote-desktop sessions, flaky GPU drivers) can't run
// Chromium's GPU process reliably — it crash-loops, the compositor can never
// paint a frame, and the window shows blank even though the page underneath
// loaded fine. Disabling hardware acceleration avoids that entirely. Must be
// called before app.ready.
app.disableHardwareAcceleration();

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
      if (!filePath.startsWith(rootDir)) {
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
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  operatorWindow.loadURL(await resolveAppUrl());
  operatorWindow.on("closed", () => {
    operatorWindow = null;
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
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
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
  // Surfaces any renderer-side error (e.g. a JS exception before
  // OutputWindowApp can call notifyReady) directly, instead of the window
  // just silently never showing with no clue why.
  if (!app.isPackaged) win.webContents.openDevTools({ mode: "detached" });
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

  const backgroundsDir = path.join(app.getPath("userData"), "backgrounds");
  protocol.handle("lumen-media", async (request) => {
    // Parse with the real URL class rather than a string replace — the
    // filename lives in the pathname (see db.js's rowToBackground), which
    // is exempt from the host-normalization Chromium applies to standard
    // schemes' authority component.
    const fileName = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ""));
    const response = await net.fetch(pathToFileURL(path.join(backgroundsDir, fileName)).toString());
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

  ipcMain.handle("display:list", () => listDisplays());
  ipcMain.handle("display:status", () => outputStatusPayload());

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
  ipcMain.on("output:state", (_event, payload) => {
    if (outputWindow && !outputWindow.isDestroyed()) outputWindow.webContents.send("output:state", payload);
  });

  // The output-only page pings this once it has actually painted real
  // content, only then is it revealed — avoids a flash of the operator UI
  // on the audience screen while the page loads and reads ?output=1.
  ipcMain.on("output:ready", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    console.log("[output] output:ready received; is the tracked output window?", win === outputWindow);
    if (win !== outputWindow || win.isDestroyed()) return;
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

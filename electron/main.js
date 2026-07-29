const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { app, BrowserWindow, ipcMain } = require("electron");
const { createDb } = require("./db.js");

let db;
let staticServer;

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

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, "..", "public", "lumen.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    if (!staticServer) staticServer = await startStaticServer(path.join(__dirname, "..", "out"));
    const { port } = staticServer.address();
    win.loadURL(`http://127.0.0.1:${port}`);
  } else {
    win.loadURL("http://localhost:3000");
  }
}

app.whenReady().then(() => {
  db = createDb(path.join(app.getPath("userData"), "lumen.db"));
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (db) db.close();
  if (staticServer) staticServer.close();
});

// Serves the production static export over a local HTTP server.

const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { app } = require("electron");

let staticServer;

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
  if (app.isPackaged && !staticServer) staticServer = await startStaticServer(path.join(__dirname, "..", "..", "out"));
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

function closeStaticServer() {
  if (staticServer) staticServer.close();
}

module.exports = { resolveAppUrl, closeStaticServer };

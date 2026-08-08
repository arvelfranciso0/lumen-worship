// The lumen-media protocol, used to serve uploaded background files to renderers.

const { protocol, net } = require("electron");
const { pathToFileURL } = require("node:url");
const { resolveWithinDir } = require("../fsSecurity.js");

// Registers the lumen-media scheme for serving uploaded background files.
function registerMediaProtocolScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "lumen-media",
      // Required for crossOrigin="anonymous" video loads to succeed.
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
    },
  ]);
}

function registerMediaProtocolHandler(backgroundsDir) {
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
}

module.exports = { registerMediaProtocolScheme, registerMediaProtocolHandler };

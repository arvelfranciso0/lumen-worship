// Shared filesystem safety helpers for the Electron main process.

const path = require("node:path");

// Strips a value down to safe filename characters.
function sanitizeFileNameSegment(value) {
  const sanitized = String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
  return sanitized || "translation";
}

// Returns null if the resolved path escapes dir.
function resolveWithinDir(dir, fileName) {
  const resolvedDir = path.resolve(dir);
  const resolved = path.resolve(dir, fileName);
  if (resolved !== resolvedDir && !resolved.startsWith(resolvedDir + path.sep)) return null;
  return resolved;
}

module.exports = { resolveWithinDir, sanitizeFileNameSegment };

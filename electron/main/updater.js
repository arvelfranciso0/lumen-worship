// Auto-updater status bridge for the operator window.

const { app } = require("electron");
const { autoUpdater } = require("electron-updater");

const HTML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

// Converts the HTML GitHub returns for release notes back into Markdown.
function htmlToMarkdown(html) {
  return html
    .replace(/\r?\n/g, " ")
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (match, level, text) => `\n\n${"#".repeat(Number(level))} ${text}\n\n`)
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n\n")
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)>(.*?)<\/\1>/gi, "*$2*")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (match, name) => HTML_ENTITIES[name] ?? match)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Normalizes releaseNotes to a single Markdown string.
function normalizeReleaseNotes(releaseNotes) {
  const notes = Array.isArray(releaseNotes) ? releaseNotes[0]?.note : releaseNotes;
  if (typeof notes !== "string") return null;
  return /<\/?[a-z][^>]*>/i.test(notes) ? htmlToMarkdown(notes) : notes;
}

function createUpdater({ getOperatorWindow }) {
  let updateStatus = { status: "idle" };
  // Whether auto-update checks are enabled; defaults to off until prefs load.
  let autoUpdateEnabled = false;
  let hasCheckedForUpdate = false;

  function checkForUpdatesIfEnabled() {
    if (!app.isPackaged || !autoUpdateEnabled || hasCheckedForUpdate) return;
    hasCheckedForUpdate = true;
    autoUpdater.checkForUpdatesAndNotify();
  }

  // Updates the current update status and notifies the operator window.
  function setUpdateStatus(next) {
    updateStatus = next;
    const operatorWindow = getOperatorWindow();
    if (operatorWindow && !operatorWindow.isDestroyed()) {
      operatorWindow.webContents.send("update:status", updateStatus);
    }
  }

  autoUpdater.on("checking-for-update", () => setUpdateStatus({ status: "checking" }));
  autoUpdater.on("update-not-available", () => setUpdateStatus({ status: "idle" }));
  autoUpdater.on("update-available", (info) => setUpdateStatus({ status: "available", version: info.version, releaseNotes: normalizeReleaseNotes(info.releaseNotes) }));
  autoUpdater.on("download-progress", (progress) => setUpdateStatus({ status: "downloading", percent: progress.percent }));
  autoUpdater.on("update-downloaded", (info) => setUpdateStatus({ status: "downloaded", version: info.version, releaseNotes: normalizeReleaseNotes(info.releaseNotes) }));
  autoUpdater.on("error", (error) => setUpdateStatus({ status: "error", error: error.message }));

  // Sets the enabled flag without triggering a check.
  function setPersistedAutoUpdateEnabled(enabled) {
    autoUpdateEnabled = enabled;
  }

  // Sets the enabled flag and checks for updates immediately.
  function setAutoUpdateEnabled(enabled) {
    autoUpdateEnabled = enabled;
    checkForUpdatesIfEnabled();
  }

  function getStatus() {
    return updateStatus;
  }

  function install() {
    return autoUpdater.quitAndInstall();
  }

  return { checkForUpdatesIfEnabled, setPersistedAutoUpdateEnabled, setAutoUpdateEnabled, getStatus, install };
}

module.exports = { createUpdater };

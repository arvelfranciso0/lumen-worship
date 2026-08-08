// Auto-updater status bridge for the operator window.

const { app } = require("electron");
const { autoUpdater } = require("electron-updater");

// Normalizes releaseNotes to a single string.
function normalizeReleaseNotes(releaseNotes) {
  if (typeof releaseNotes === "string") return releaseNotes;
  if (Array.isArray(releaseNotes) && releaseNotes.length > 0) return releaseNotes[0].note;
  return null;
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

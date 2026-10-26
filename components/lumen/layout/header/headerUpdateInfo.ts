import type { UpdateStatus } from "../../electron-bridges/electronUpdater";

// True when there's a pending update to flag; only "downloaded" is installable.
export function isUpdatePending(updateStatus: UpdateStatus): boolean {
  return (
    updateStatus.status === "available" ||
    updateStatus.status === "downloading" ||
    updateStatus.status === "downloaded"
  );
}

export function isUpdateReady(updateStatus: UpdateStatus): boolean {
  return updateStatus.status === "downloaded";
}

// True when a beta is available but waiting for the user to choose to download it.
export function isBetaAwaitingDownload(updateStatus: UpdateStatus): boolean {
  return updateStatus.status === "available" && !!updateStatus.isBeta;
}

// Version text with a "(beta)" marker for pre-releases.
function versionLabel(version: string, isBeta?: boolean): string {
  return isBeta ? version + " (beta)" : version;
}

// Label for the Updates button and its title attribute.
export function getUpdateLabel(updateStatus: UpdateStatus): string {
  switch (updateStatus.status) {
    case "downloaded":
      return "Update " + versionLabel(updateStatus.version, updateStatus.isBeta) + " ready to install";
    case "downloading":
      return "Downloading update… " + Math.round(updateStatus.percent) + "%";
    case "available":
      return "Update " + versionLabel(updateStatus.version, updateStatus.isBeta) + " available";
    case "checking":
      return "Checking for updates…";
    case "error":
      return "Update check failed";
    default:
      return "No updates available";
  }
}

// Headline title for the update popover, one per update status.
export function getUpdateCardTitle(updateStatus: UpdateStatus): string {
  switch (updateStatus.status) {
    case "downloaded":
      return "Lumen " + versionLabel(updateStatus.version, updateStatus.isBeta) + " ready to install";
    case "available":
      return "Lumen " + versionLabel(updateStatus.version, updateStatus.isBeta) + " available";
    case "downloading":
      return "Downloading update… " + Math.round(updateStatus.percent) + "%";
    case "checking":
      return "Checking for updates…";
    case "error":
      return "Update check failed";
    default:
      return "You're up to date";
  }
}

export function getUpdateReleaseNotes(updateStatus: UpdateStatus): string | null {
  return updateStatus.status === "available" || updateStatus.status === "downloaded"
    ? updateStatus.releaseNotes
    : null;
}

// The fullscreen "audience" output window and multi-display management.

const path = require("node:path");
const { BrowserWindow, screen } = require("electron");

function createOutputWindowManager({ getOperatorWindow, resolveAppUrl }) {
  let outputWindow = null;
  // The most recent payload pushed via output:state, replayed once the output window loads.
  let lastOutputStatePayload = null;
  // Which display the output window uses; "auto" picks the first non-primary display.
  let selectedOutputDisplayId = "auto";

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
    const operatorWindow = getOperatorWindow();
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
        preload: path.join(__dirname, "..", "preload", "output.js"),
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

  function open(displayId) {
    selectedOutputDisplayId = displayId ?? "auto";
    return openOutputWindow();
  }

  function close() {
    closeOutputWindow();
    return { ok: true };
  }

  // Relays the operator's live state to the output window.
  function pushState(event, payload) {
    // Ignores state pushes from any window other than the operator.
    if (BrowserWindow.fromWebContents(event.sender) !== getOperatorWindow()) return;
    lastOutputStatePayload = payload;
    if (outputWindow && !outputWindow.isDestroyed()) outputWindow.webContents.send("output:state", payload);
  }

  // Reveals the output window once it signals it has rendered.
  function handleReady(event) {
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
  }

  return {
    listDisplays,
    outputStatusPayload,
    open,
    close,
    handleDisplayRemoved,
    handleDisplaysChanged,
    pushState,
    handleReady,
  };
}

module.exports = { createOutputWindowManager };

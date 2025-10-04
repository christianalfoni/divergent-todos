"use strict";
const electron = require("electron");
const path = require("node:path");
const crypto = require("node:crypto");
let win = null;
const authSessions = /* @__PURE__ */ new Map();
const CF_BASE = process.env.VITE_CF_BASE_URL || "https://us-central1-divergent-todos.cloudfunctions.net";
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    electron.app.setAsDefaultProtocolClient("divergent-todos", process.execPath, [
      path.resolve(process.argv[1])
    ]);
  }
} else {
  electron.app.setAsDefaultProtocolClient("divergent-todos");
}
electron.app.on("open-url", (event, url) => {
  event.preventDefault();
  handleAuthCallback(url);
});
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", (event, commandLine) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const url = commandLine.find((arg) => arg.startsWith("divergent-todos://"));
    if (url) {
      handleAuthCallback(url);
    }
  });
}
function handleAuthCallback(url) {
  const urlObj = new URL(url);
  const sid = urlObj.searchParams.get("sid");
  if (!sid) {
    console.error("No sid in auth callback URL");
    return;
  }
  const session = authSessions.get(sid);
  if (!session) {
    console.error("No matching auth session found for sid:", sid);
    return;
  }
  session.resolver(sid);
  authSessions.delete(sid);
}
async function createWindow() {
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  if (!electron.app.isPackaged) {
    await win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "../../web/index.html"));
  }
}
electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());
electron.ipcMain.handle("auth:startGoogleSignIn", async () => {
  try {
    const clientNonce = crypto.randomUUID();
    const response = await fetch(`${CF_BASE}/authStart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientNonce })
    });
    if (!response.ok) {
      throw new Error(`Failed to start auth: ${response.statusText}`);
    }
    const { authorizeUrl, sid } = await response.json();
    const sessionPromise = new Promise((resolve, reject) => {
      authSessions.set(sid, {
        sid,
        clientNonce,
        createdAt: Date.now(),
        resolver: resolve
      });
      setTimeout(() => {
        const session = authSessions.get(sid);
        if (session) {
          authSessions.delete(sid);
          reject(new Error("Authentication timeout"));
        }
      }, 10 * 60 * 1e3);
    });
    await electron.shell.openExternal(authorizeUrl);
    const returnedSid = await sessionPromise;
    const exchangeResponse = await fetch(`${CF_BASE}/authExchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: returnedSid, clientNonce })
    });
    if (!exchangeResponse.ok) {
      const error = await exchangeResponse.json();
      throw new Error(error.error || "Failed to exchange token");
    }
    const { customToken } = await exchangeResponse.json();
    return customToken;
  } catch (error) {
    console.error("Auth flow error:", error);
    throw error;
  }
});
electron.app.whenReady().then(createWindow);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});

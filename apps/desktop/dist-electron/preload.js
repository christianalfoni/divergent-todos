"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("native", {
  getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
  auth: {
    startGoogleSignIn: () => electron.ipcRenderer.invoke("auth:startGoogleSignIn")
  },
  updater: {
    check: () => electron.ipcRenderer.invoke("update:check"),
    download: () => electron.ipcRenderer.invoke("update:download"),
    install: () => electron.ipcRenderer.invoke("update:install"),
    onChecking: (callback) => electron.ipcRenderer.on("update:checking", callback),
    onAvailable: (callback) => electron.ipcRenderer.on("update:available", (_event, info) => callback(info)),
    onNotAvailable: (callback) => electron.ipcRenderer.on("update:not-available", (_event, info) => callback(info)),
    onError: (callback) => electron.ipcRenderer.on("update:error", (_event, message) => callback(message)),
    onDownloadProgress: (callback) => electron.ipcRenderer.on(
      "update:download-progress",
      (_event, progress) => callback(progress)
    ),
    onDownloaded: (callback) => electron.ipcRenderer.on("update:downloaded", (_event, info) => callback(info))
  }
  // Add more commands that the UI needs (file pickers, app paths, etc.)
});

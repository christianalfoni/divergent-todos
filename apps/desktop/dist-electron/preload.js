"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("native", {
  getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
  openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
  auth: {
    startGoogleSignIn: () => electron.ipcRenderer.invoke("auth:startGoogleSignIn")
  },
  updater: {
    check: () => electron.ipcRenderer.invoke("update:check"),
    download: () => electron.ipcRenderer.invoke("update:download"),
    install: () => electron.ipcRenderer.invoke("update:install"),
    onChecking: (callback) => {
      const listener = () => callback();
      electron.ipcRenderer.on("update:checking", listener);
      return () => electron.ipcRenderer.removeListener("update:checking", listener);
    },
    onAvailable: (callback) => {
      const listener = (_event, info) => callback(info);
      electron.ipcRenderer.on("update:available", listener);
      return () => electron.ipcRenderer.removeListener("update:available", listener);
    },
    onNotAvailable: (callback) => {
      const listener = (_event, info) => callback(info);
      electron.ipcRenderer.on("update:not-available", listener);
      return () => electron.ipcRenderer.removeListener("update:not-available", listener);
    },
    onError: (callback) => {
      const listener = (_event, message) => callback(message);
      electron.ipcRenderer.on("update:error", listener);
      return () => electron.ipcRenderer.removeListener("update:error", listener);
    },
    onDownloadProgress: (callback) => {
      const listener = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("update:download-progress", listener);
      return () => electron.ipcRenderer.removeListener("update:download-progress", listener);
    },
    onDownloaded: (callback) => {
      const listener = (_event, info) => callback(info);
      electron.ipcRenderer.on("update:downloaded", listener);
      return () => electron.ipcRenderer.removeListener("update:downloaded", listener);
    }
  }
  // Add more commands that the UI needs (file pickers, app paths, etc.)
});

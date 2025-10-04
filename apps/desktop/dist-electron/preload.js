"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("native", {
  getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
  auth: {
    startGoogleSignIn: () => electron.ipcRenderer.invoke("auth:startGoogleSignIn")
  }
  // Add more commands that the UI needs (file pickers, app paths, etc.)
});

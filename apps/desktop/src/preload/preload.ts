import { contextBridge, ipcRenderer } from 'electron'

// Expose a narrow, data-only API
contextBridge.exposeInMainWorld('native', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  auth: {
    startGoogleSignIn: () => ipcRenderer.invoke('auth:startGoogleSignIn'),
  },
  // Add more commands that the UI needs (file pickers, app paths, etc.)
})

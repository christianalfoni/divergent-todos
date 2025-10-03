import { contextBridge, ipcRenderer } from 'electron'

// Expose a narrow, data-only API
contextBridge.exposeInMainWorld('native', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  // Add more commands that the UI needs (file pickers, app paths, etc.)
})

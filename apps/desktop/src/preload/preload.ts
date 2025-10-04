import { contextBridge, ipcRenderer } from 'electron'

// Expose a narrow, data-only API
contextBridge.exposeInMainWorld('native', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  auth: {
    startGoogleSignIn: () => ipcRenderer.invoke('auth:startGoogleSignIn'),
  },
  updater: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onChecking: (callback: () => void) =>
      ipcRenderer.on('update:checking', callback),
    onAvailable: (callback: (info: any) => void) =>
      ipcRenderer.on('update:available', (_event, info) => callback(info)),
    onNotAvailable: (callback: (info: any) => void) =>
      ipcRenderer.on('update:not-available', (_event, info) => callback(info)),
    onError: (callback: (message: string) => void) =>
      ipcRenderer.on('update:error', (_event, message) => callback(message)),
    onDownloadProgress: (callback: (progress: any) => void) =>
      ipcRenderer.on('update:download-progress', (_event, progress) =>
        callback(progress)
      ),
    onDownloaded: (callback: (info: any) => void) =>
      ipcRenderer.on('update:downloaded', (_event, info) => callback(info)),
  },
  // Add more commands that the UI needs (file pickers, app paths, etc.)
})

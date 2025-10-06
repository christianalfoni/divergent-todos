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
    onChecking: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('update:checking', listener)
      return () => ipcRenderer.removeListener('update:checking', listener)
    },
    onAvailable: (callback: (info: any) => void) => {
      const listener = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update:available', listener)
      return () => ipcRenderer.removeListener('update:available', listener)
    },
    onNotAvailable: (callback: (info: any) => void) => {
      const listener = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update:not-available', listener)
      return () => ipcRenderer.removeListener('update:not-available', listener)
    },
    onError: (callback: (message: string) => void) => {
      const listener = (_event: any, message: string) => callback(message)
      ipcRenderer.on('update:error', listener)
      return () => ipcRenderer.removeListener('update:error', listener)
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress)
      ipcRenderer.on('update:download-progress', listener)
      return () => ipcRenderer.removeListener('update:download-progress', listener)
    },
    onDownloaded: (callback: (info: any) => void) => {
      const listener = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update:downloaded', listener)
      return () => ipcRenderer.removeListener('update:downloaded', listener)
    },
  },
  // Add more commands that the UI needs (file pickers, app paths, etc.)
})

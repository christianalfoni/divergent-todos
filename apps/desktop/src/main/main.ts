import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

let win: BrowserWindow | null = null

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (!app.isPackaged) {
    await win.loadURL('http://localhost:5173') // Vite dev server (renderer)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(path.join(__dirname, '../../web/index.html'))
  }
}

// Example typed IPC
ipcMain.handle('app:getVersion', () => app.getVersion())

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

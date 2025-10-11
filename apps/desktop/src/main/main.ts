import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'node:path'
import crypto from 'node:crypto'

let win: BrowserWindow | null = null

// Session storage for auth flows
interface AuthSessionStore {
  sid: string
  clientNonce: string
  createdAt: number
  resolver: (sid: string) => void
}
const authSessions = new Map<string, AuthSessionStore>()

// Cloud Functions base URL
const CF_BASE =
  process.env.VITE_CF_BASE_URL ||
  'https://us-central1-divergent-todos.cloudfunctions.net'

// Register custom protocol handler for OAuth callback
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('divergent-todos', process.execPath, [
      path.resolve(process.argv[1]),
    ])
  }
} else {
  app.setAsDefaultProtocolClient('divergent-todos')
}

// Handle the protocol on macOS
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleAuthCallback(url)
})

// Handle the protocol on Windows
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, focus our window
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }

    // Handle protocol URL on Windows
    const url = commandLine.find((arg) => arg.startsWith('divergent-todos://'))
    if (url) {
      handleAuthCallback(url)
    }
  })
}

function handleAuthCallback(url: string) {
  // Parse the session ID from the URL
  // Expected format: divergent-todos://auth/callback?sid=SESSION_ID
  const urlObj = new URL(url)
  const sid = urlObj.searchParams.get('sid')

  if (!sid) {
    console.error('No sid in auth callback URL')
    return
  }

  // Find the matching session
  const session = authSessions.get(sid)
  if (!session) {
    console.error('No matching auth session found for sid:', sid)
    return
  }

  // Resolve the promise with the sid
  session.resolver(sid)
  authSessions.delete(sid)
}

// Configure auto-updater
autoUpdater.autoDownload = false // Don't auto-download, let user decide
autoUpdater.autoInstallOnAppQuit = true

// Log configuration for debugging
console.log('Auto-updater configuration:', {
  autoDownload: autoUpdater.autoDownload,
  autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
  currentVersion: app.getVersion(),
  isPackaged: app.isPackaged,
})

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...')
  win?.webContents.send('update:checking')
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version)
  win?.webContents.send('update:available', info)
})

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info.version)
  win?.webContents.send('update:not-available', info)
})

autoUpdater.on('error', (err) => {
  console.error('Update error:', err)
  console.error('Update error stack:', err.stack)
  win?.webContents.send('update:error', err.message)
})

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download progress: ${progressObj.percent.toFixed(2)}%`)
  win?.webContents.send('update:download-progress', progressObj)
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version)
  win?.webContents.send('update:downloaded', info)
})

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Divergent Todos',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Intercept window.open and new window requests
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation to app's own domain/localhost in dev
    const appOrigin = app.isPackaged ? 'file://' : 'http://localhost:5173'

    if (url.startsWith(appOrigin)) {
      return { action: 'allow' }
    }

    // Open external URLs in system browser by default
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged) {
    await win.loadURL('http://localhost:5173') // Vite dev server (renderer)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(path.join(process.resourcesPath, 'web/index.html'))
  }

  // Check for updates after app loads (only in production)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 3000) // Wait 3 seconds after launch
  }

  // Check for updates when window becomes visible/focused
  win.on('focus', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates()
    }
  })
}

// Example typed IPC
ipcMain.handle('app:getVersion', () => app.getVersion())

// Open URL in default browser
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
})

// Open URL in modal window (for Stripe, billing, etc.)
ipcMain.handle('shell:openInWindow', async (_event, url: string, options?: { title?: string }) => {
  const modalWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: options?.title || 'Payment',
    parent: win || undefined,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  await modalWindow.loadURL(url)

  // Focus parent window when modal closes and notify renderer
  modalWindow.on('closed', () => {
    if (win && !win.isDestroyed()) {
      win.focus()
      win.webContents.send('window:closed')
    }
  })
})

// Update IPC handlers
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) {
    return { available: false, message: 'Updates only available in production' }
  }
  return await autoUpdater.checkForUpdates()
})

ipcMain.handle('update:download', async () => {
  return await autoUpdater.downloadUpdate()
})

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall()
})

// Auth IPC handlers
ipcMain.handle('auth:startGoogleSignIn', async () => {
  try {
    // Generate client nonce
    const clientNonce = crypto.randomUUID()

    // Call /authStart to get OAuth URL and session ID
    const response = await fetch(`${CF_BASE}/authStart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientNonce }),
    })

    if (!response.ok) {
      throw new Error(`Failed to start auth: ${response.statusText}`)
    }

    const { authorizeUrl, sid } = await response.json() as { authorizeUrl: string; sid: string }

    // Store session locally
    const sessionPromise = new Promise<string>((resolve, reject) => {
      authSessions.set(sid, {
        sid,
        clientNonce,
        createdAt: Date.now(),
        resolver: resolve,
      })

      // Timeout after 10 minutes
      setTimeout(() => {
        const session = authSessions.get(sid)
        if (session) {
          authSessions.delete(sid)
          reject(new Error('Authentication timeout'))
        }
      }, 10 * 60 * 1000)
    })

    // Open system browser
    await shell.openExternal(authorizeUrl)

    // Wait for callback
    const returnedSid = await sessionPromise

    // Exchange sid for custom token
    const exchangeResponse = await fetch(`${CF_BASE}/authExchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: returnedSid, clientNonce }),
    })

    if (!exchangeResponse.ok) {
      const error = await exchangeResponse.json() as { error?: string }
      throw new Error(error.error || 'Failed to exchange token')
    }

    const { customToken } = await exchangeResponse.json() as { customToken: string }
    return customToken
  } catch (error) {
    console.error('Auth flow error:', error)
    throw error
  }
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

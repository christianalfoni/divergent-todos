/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend window for Electron IPC
declare global {
  interface Window {
    native?: {
      getVersion: () => Promise<string>
      openExternal: (url: string) => Promise<void>
      openInWindow: (url: string, options?: { title?: string }) => Promise<void>
      onWindowClosed: (callback: () => void) => () => void
      auth: {
        startGoogleSignIn: () => Promise<string>
      }
      updater: {
        check: () => Promise<any>
        download: () => Promise<any>
        install: () => void
        onChecking: (callback: () => void) => () => void
        onAvailable: (callback: (info: { version: string }) => void) => () => void
        onNotAvailable: (callback: (info: { version: string }) => void) => () => void
        onError: (callback: (message: string) => void) => () => void
        onDownloadProgress: (
          callback: (progress: {
            percent: number
            bytesPerSecond: number
            total: number
            transferred: number
          }) => void
        ) => () => void
        onDownloaded: (callback: (info: { version: string }) => void) => () => void
      }
    }
  }
}

export {}

export {}

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

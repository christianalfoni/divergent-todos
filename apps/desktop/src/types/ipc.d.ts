export {}

declare global {
  interface Window {
    native?: {
      getVersion: () => Promise<string>
      auth: {
        startGoogleSignIn: () => Promise<string>
      }
    }
  }
}

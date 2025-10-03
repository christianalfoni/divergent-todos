export {}

declare global {
  interface Window {
    native: {
      getVersion: () => Promise<string>
    }
  }
}

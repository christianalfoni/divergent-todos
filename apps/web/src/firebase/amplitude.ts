import * as amplitude from "@amplitude/analytics-browser";

// Initialize Amplitude
const API_KEY = "96fea7e1d7ae103a4ffde218116690f1";

// Detect if running in Electron
const isElectron = !!(
  typeof window !== "undefined" &&
  window.navigator &&
  window.navigator.userAgent &&
  window.navigator.userAgent.toLowerCase().includes("electron")
);

// Get app version from package.json (set via build process)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "unknown";

if (!API_KEY) {
  console.warn("Amplitude API key not found. Analytics will not be tracked.");
} else {
  amplitude.init(API_KEY, undefined, {
    // Track app version to distinguish between releases
    appVersion: APP_VERSION,

    // Optional configuration
    defaultTracking: {
      sessions: true,
      pageViews: false, // We'll manually track app usage
      formInteractions: false,
      fileDownloads: false,
    },
  });

  // Set platform as a user property to filter events
  const identify = new amplitude.Identify();
  identify.set("platform", isElectron ? "desktop" : "web");
  amplitude.identify(identify);
}

export { amplitude };

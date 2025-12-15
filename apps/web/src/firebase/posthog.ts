import posthog from "posthog-js/dist/module.no-external";

// Initialize PostHog
const API_KEY = "phc_xG91hee7fdFy7k06NBDwjAf5a5GRXUzyGHlgiVE2C7g";
const HOST = "https://app.posthog.com";

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
  console.warn("PostHog API key not found. Analytics will not be tracked.");
} else {
  posthog.init(API_KEY, {
    api_host: HOST,

    // Electron security: Load all code locally
    disable_external_dependency_loading: true,

    // Privacy settings
    capture_pageview: false, // We'll manually track app usage
    capture_pageleave: false,

    // Autocapture settings
    autocapture: false, // Disable to match explicit tracking

    // Performance
    loaded: (posthogInstance) => {
      // Set platform and app version as super properties (sent with all events)
      posthogInstance.register({
        platform: isElectron ? "desktop" : "web",
        app_version: APP_VERSION,
      });
    },
  });
}

export { posthog };

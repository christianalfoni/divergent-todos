import posthog, { type Survey } from "posthog-js/dist/module.full.no-external";

const POSTHOG_API_KEY = "phc_xG91hee7fdFy7k06NBDwjAf5a5GRXUzyGHlgiVE2C7g";

posthog.init(POSTHOG_API_KEY, {
  api_host: "https://app.posthog.com",
  person_profiles: "identified_only",
});
// Create a wrapped version that safely handles uninitialized state
const safePosthog = {
  ...posthog,
  getActiveMatchingSurveys: async (
    callback?: (surveys: Survey[]) => void
  ): Promise<Survey[]> => {
    return new Promise((resolve) => {
      posthog.getActiveMatchingSurveys((surveys) => {
        callback?.(surveys);
        resolve(surveys);
      });
    });
  },
  identify: (distinctId: string, properties?: Record<string, any>) => {
    return posthog.identify(distinctId, properties);
  },
  capture: (event: string, properties?: Record<string, any>) => {
    return posthog.capture(event, properties);
  },
  setPersonProperties: (properties: Record<string, any>) => {
    return posthog.setPersonProperties(properties);
  },
};

export { safePosthog as posthog };
export type { Survey };

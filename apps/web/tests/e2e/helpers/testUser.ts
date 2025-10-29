import type { Page } from "@playwright/test";

export interface TestUserData {
  uid: string;
  customToken: string;
  email: string;
}

/**
 * Creates a test user via the Firebase Cloud Function
 */
export async function createTestUser(page: Page): Promise<TestUserData> {
  const devSecret = process.env.VITE_DEV_MODE_SECRET;
  if (!devSecret) {
    throw new Error("VITE_DEV_MODE_SECRET environment variable is not set");
  }

  // Navigate to the app to get access to Firebase
  await page.goto("/");

  // Wait for app to load and test helpers to be available
  await page.waitForFunction(() => (window as any).__testHelpers !== undefined);

  // Call the createTestUser cloud function via window.__testHelpers
  const result = await page.evaluate(
    async ({ secret }: { secret: string }) => {
      const helpers = (window as any).__testHelpers;
      return await helpers.createTestUser(secret);
    },
    { secret: devSecret }
  );

  return result;
}

/**
 * Deletes a test user via the Firebase Cloud Function
 */
export async function deleteTestUser(
  page: Page,
  uid: string
): Promise<void> {
  await page.evaluate(async (userId: string) => {
    const helpers = (window as any).__testHelpers;
    await helpers.deleteTestUser(userId);
  }, uid);
}

/**
 * Signs in a test user using the custom token
 */
export async function signInTestUser(
  page: Page,
  customToken: string
): Promise<void> {
  // Execute sign-in in the page context via window.__testHelpers
  await page.evaluate(async (token: string) => {
    const helpers = (window as any).__testHelpers;
    await helpers.signInTestUser(token);
  }, customToken);

  // Wait for auth state to settle
  await page.waitForTimeout(2000);
}

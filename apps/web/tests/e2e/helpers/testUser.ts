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

  // Call the createTestUser cloud function
  const result = await page.evaluate(
    async ({ secret }: { secret: string }) => {
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("./firebase");
      const createTestUserFn = httpsCallable(functions, "createTestUser");
      const response = await createTestUserFn({ devSecret: secret });
      return response.data as {
        uid: string;
        customToken: string;
        email: string;
      };
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
    const { httpsCallable } = await import("firebase/functions");
    const { functions } = await import("./firebase");
    const deleteTestUserFn = httpsCallable(functions, "deleteTestUser");
    await deleteTestUserFn({ uid: userId });
  }, uid);
}

/**
 * Signs in a test user using the custom token
 */
export async function signInTestUser(
  page: Page,
  customToken: string
): Promise<void> {
  // Execute sign-in in the page context
  await page.evaluate(async (token: string) => {
    const { signInWithCustomToken } = await import("firebase/auth");
    const { auth } = await import("./firebase");
    await signInWithCustomToken(auth, token);
  }, customToken);

  // Wait for auth state to settle
  await page.waitForTimeout(2000);
}

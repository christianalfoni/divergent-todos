/**
 * Test helpers exposed on window object for E2E testing
 * Only available in development mode
 */
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { auth, functions } from "./firebase";

export interface TestUserData {
  uid: string;
  customToken: string;
  email: string;
}

export async function createTestUser(
  devSecret: string
): Promise<TestUserData> {
  const createTestUserFn = httpsCallable(functions, "createTestUser");
  const response = await createTestUserFn({ devSecret });
  return response.data as TestUserData;
}

export async function deleteTestUser(uid: string): Promise<void> {
  const deleteTestUserFn = httpsCallable(functions, "deleteTestUser");
  await deleteTestUserFn({ uid });
}

export async function signInTestUser(customToken: string): Promise<void> {
  await signInWithCustomToken(auth, customToken);
}

// Expose helpers on window for E2E tests (dev mode only)
if (import.meta.env.DEV) {
  (window as any).__testHelpers = {
    createTestUser,
    deleteTestUser,
    signInTestUser,
  };
}

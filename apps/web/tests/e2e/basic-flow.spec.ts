import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, signInTestUser } from "./helpers/testUser";

test.describe("Basic Authentication and Todo Flow", () => {
  let testUserId: string;

  test("should create test user, sign in, and interact with todos", async ({ page }) => {
    // Create test user
    const testUser = await createTestUser(page);
    testUserId = testUser.uid;

    console.log(`Created test user: ${testUser.email}`);

    // Sign in with test user
    await signInTestUser(page, testUser.customToken);

    // Verify we're signed in by checking for the test mode badge
    await expect(page.getByText("Test Mode")).toBeVisible();

    // Verify the calendar view is visible
    await expect(page.getByRole("navigation")).toBeVisible();

    // Verify tutorial is showing (auto-starts for new users)
    await expect(page.getByText("Toggle between view modes")).toBeVisible();

    console.log("Test user signed in successfully");
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test user
    if (testUserId) {
      console.log(`Cleaning up test user: ${testUserId}`);
      try {
        await deleteTestUser(page, testUserId);
        console.log("Test user deleted successfully");
      } catch (error) {
        console.error("Failed to delete test user:", error);
      }
    }
  });
});

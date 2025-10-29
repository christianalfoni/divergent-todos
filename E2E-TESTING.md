# E2E Testing Implementation Guide

## Overview

This document explains how the E2E (End-to-End) testing system works in Divergent Todos. The system allows automated tests to run through the real application flow (sign-in, todos, subscriptions) without mocking, using dynamically created test users.

## Architecture

### Core Concept: Test Users

Test users are **real Firebase users** with a special `isTestUser: true` flag in their Firestore document. This flag triggers different behavior in the backend:

- **Stripe**: Uses test mode API keys instead of live keys
- **Auto-cleanup**: Test users are automatically deleted on sign out
- **Safety net**: Scheduled function cleans up test users older than 24 hours

```
┌─────────────────────────────────────────────────────────────┐
│                     E2E Test Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Create Test User (Cloud Function)                      │
│     ↓                                                       │
│  2. Sign In with Custom Token                              │
│     ↓                                                       │
│  3. Run Test Scenarios (Playwright)                        │
│     ↓                                                       │
│  4. Clean Up (Delete Test User)                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Setup Guide

### Prerequisites

1. **Stripe Test Mode Setup**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Toggle to **Test Mode** (top-right corner)
   - Create a test product: **Products** → **Add Product**
   - Add pricing (e.g., $10/month)
   - Copy the **Price ID** (starts with `price_...`)
   - Go to **Developers** → **API Keys**
   - Copy the **Secret key** (starts with `sk_test_...`)

2. **Set Firebase Secrets**

```bash
cd functions

# Dev mode secret (for test user creation)
firebase functions:secrets:set DEV_MODE_SECRET

# Stripe test API key
firebase functions:secrets:set STRIPE_TEST_API_KEY

# Stripe test price ID (from step 1)
firebase functions:secrets:set STRIPE_TEST_PRICE_ID
```

3. **Deploy Cloud Functions**

```bash
cd apps/web
firebase deploy --only functions
```

4. **GitHub Secrets** (for CI)
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add: `DEV_MODE_SECRET` (same value as Firebase secret)

5. **Create Local Environment File**

Create `apps/web/.env.local`:
```bash
VITE_DEV_MODE_SECRET=your-dev-secret-here
```

(Use the same value you set in Firebase secrets)

6. **Test Locally**

```bash
# From apps/web directory
pnpm exec playwright test

# Or test the dev mode button by running the dev server
pnpm dev:web
# Then visit http://localhost:5173 and click "Sign in as Test User"
```

---

## Components

### 1. Cloud Functions (Backend)

#### `createTestUser`
**Location**: `functions/src/index.ts:562-619`

**Purpose**: Creates a test user and returns a custom token for authentication.

**Security**: Requires `DEV_MODE_SECRET` to prevent unauthorized test user creation.

**Flow**:
```typescript
1. Validate devSecret parameter
2. Generate unique email: test-{timestamp}-{random}@divergent-todos-test.com
3. Create user in Firebase Auth
4. Create user document in Firestore with isTestUser: true
5. Generate custom token for sign-in
6. Return { uid, customToken, email }
```

**Usage**:
```typescript
const createTestUser = httpsCallable(functions, "createTestUser");
const result = await createTestUser({
  devSecret: process.env.VITE_DEV_MODE_SECRET
});
const { uid, customToken, email } = result.data;
```

#### `deleteTestUser`
**Location**: `functions/src/index.ts:621-696`

**Purpose**: Safely deletes a test user and ALL associated data.

**Safety Check**: Verifies `isTestUser: true` flag before deletion to prevent accidental deletion of real users.

**Flow**:
```typescript
1. Validate uid parameter
2. Verify user exists and has isTestUser: true flag
3. Delete in batch:
   - All todos (where userId == uid)
   - All activity records
   - Profile document
   - Payments subcollection
   - User document
4. Delete from Firebase Auth
```

**Usage**:
```typescript
const deleteTestUser = httpsCallable(functions, "deleteTestUser");
await deleteTestUser({ uid: testUser.uid });
```

#### `cleanupOldTestUsers`
**Location**: `functions/src/index.ts:1337-1408`

**Purpose**: Scheduled safety net to clean up leaked test users.

**Schedule**: Runs daily at 2 AM (America/New_York timezone)

**Logic**:
```typescript
1. Query users where isTestUser == true AND createdAt < 24 hours ago
2. For each old test user:
   - Delete todos, activity, profile, payments
   - Delete from Auth
3. Log results
```

---

### 2. Stripe Integration

#### Test Mode Detection
**Location**: `functions/src/index.ts` (multiple functions)

All Stripe functions check for test users:

```typescript
// Check if test user
const userDoc = await db.collection("users").doc(uid).get();
const isTestUser = userDoc.data()?.isTestUser || false;

// Use appropriate Stripe key
const stripeApiKey = isTestUser
  ? STRIPE_TEST_API_KEY.value()
  : STRIPE_API_KEY.value();

const stripe = stripeFrom(stripeApiKey);
```

**Functions Updated**:
- `createSubscription` (lines 787-837) - Uses test/live API key AND price ID
- `createBillingPortal` (lines 840-880) - Uses test/live API key
- `stopSubscription` (lines 883-909) - Uses test/live API key
- `resumeSubscription` (lines 912-938) - Uses test/live API key

**How It Works**:
- Test users → Stripe test mode (test API key + test price ID) → No real charges
- Real users → Stripe live mode (live API key + live price ID) → Real charges
- Same code path, different API keys and price IDs

**Price ID Selection**:
```typescript
const priceId = isTestUser
  ? STRIPE_TEST_PRICE_ID.value()
  : STRIPE_PRICE_ID.value();
```

This ensures test subscriptions use test products and real subscriptions use live products.

---

### 3. Frontend Integration

#### Test User Sign-In Hook
**Location**: `apps/web/src/hooks/useTestSignin.ts`

**Purpose**: React hook for creating and signing in test users from the UI.

**Usage**:
```typescript
const { signInAsTestUser, loading, error } = useTestSignin();

// Call when user clicks test sign-in button
await signInAsTestUser();
// → Creates test user via Cloud Function
// → Signs in with custom token
// → Triggers onAuthStateChanged
```

#### Dev Mode Button
**Location**: `apps/web/src/LandingPage.tsx:107-123`

**Visibility**: Only shown when `import.meta.env.DEV === true`

```tsx
{import.meta.env.DEV && (
  <button onClick={signInAsTestUser} disabled={isTestSigningIn}>
    🧪 {isTestSigningIn ? "Creating test user..." : "Sign in as Test User"}
  </button>
)}
```

#### Auto-Delete on Sign Out
**Location**: `apps/web/src/TopBar/index.tsx:89-115`

**Purpose**: Automatically detects and deletes test users when they sign out.

**Flow**:
```typescript
const handleSignOut = async () => {
  const currentUser = auth.currentUser;

  if (currentUser) {
    // Check if test user
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.data();

    if (userData?.isTestUser) {
      // Delete test user and all data
      await deleteTestUser({ uid: currentUser.uid });
    }
  }

  // Sign out
  await signOut(auth);
};
```

#### Test Mode Badge
**Location**: `apps/web/src/TopBar/index.tsx` (uses `useIsTestUser` hook)

**Purpose**: Yellow badge that shows next to the logo when signed in as test user.

**Display**: `Test Mode` (small badge with yellow background)

---

### 4. Playwright Test Framework

#### Configuration
**Location**: `apps/web/playwright.config.ts`

**Key Settings**:
```typescript
{
  testDir: "./tests/e2e",
  fullyParallel: false,  // Run tests serially
  workers: 1,            // One test at a time
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev:web",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  }
}
```

#### Test Utilities
**Location**: `apps/web/tests/e2e/helpers/testUser.ts`

**Helper Functions**:

```typescript
// Create test user
const testUser = await createTestUser(page);
// Returns: { uid, customToken, email }

// Sign in test user
await signInTestUser(page, testUser.customToken);
// Executes sign-in in page context

// Delete test user
await deleteTestUser(page, testUser.uid);
// Cleans up test user and data
```

#### Example Test
**Location**: `apps/web/tests/e2e/basic-flow.spec.ts`

**Pattern**:
```typescript
test("test name", async ({ page }) => {
  // 1. Create test user
  const testUser = await createTestUser(page);

  // 2. Sign in
  await signInTestUser(page, testUser.customToken);

  // 3. Verify signed in
  await expect(page.getByText("Test Mode")).toBeVisible();

  // 4. Run test scenarios
  // ... test code here ...
});

test.afterEach(async ({ page }) => {
  // 5. Cleanup
  if (testUserId) {
    await deleteTestUser(page, testUserId);
  }
});
```

---

## Running Tests

### Local Development

```bash
# Run all tests
pnpm --filter web exec playwright test

# Run specific test file
pnpm --filter web exec playwright test basic-flow

# Run in UI mode (interactive)
pnpm --filter web exec playwright test --ui

# Update visual baselines
pnpm --filter web exec playwright test --update-snapshots

# View HTML report
pnpm --filter web exec playwright show-report
```

### CI/CD (GitHub Actions)

**Location**: `.github/workflows/e2e-tests.yml`

**Triggers**:
- Pull requests to `main`
- Pushes to `main`

**Steps**:
1. Install dependencies
2. Install Playwright browsers
3. Build web app
4. Run E2E tests
5. Upload test results and screenshots as artifacts

**Required GitHub Secrets**:
- `DEV_MODE_SECRET` - For test user creation

---

## Environment Variables

### Local Development
**Location**: `apps/web/.env.local` (gitignored)

```bash
VITE_DEV_MODE_SECRET=your-dev-secret-here
```

**Important**: This file must be in the `apps/web` directory (not the root) because Vite looks for environment variables in the same directory as `vite.config.ts`.

### Firebase Functions
**Set via Firebase CLI**:

```bash
# Required for test user creation
firebase functions:secrets:set DEV_MODE_SECRET

# Required for test Stripe operations
firebase functions:secrets:set STRIPE_TEST_API_KEY

# Required for test subscriptions (must be test mode price ID)
firebase functions:secrets:set STRIPE_TEST_PRICE_ID
```

**Important**: `STRIPE_TEST_PRICE_ID` must be a price ID from your Stripe **test mode** dashboard. Create a test product with a test price in Stripe Dashboard (with test mode toggle ON) and use that price ID.

### GitHub Actions
**Set in**: Repository Settings → Secrets and variables → Actions

- `DEV_MODE_SECRET` - Same value as Firebase secret

---

## Security & Safety

### 1. Test User Identification
- Email pattern: `test-{timestamp}-{random}@divergent-todos-test.com`
- Firestore flag: `isTestUser: true`
- Only test users can be deleted via `deleteTestUser` function

### 2. Access Control
- `createTestUser` requires `DEV_MODE_SECRET`
- Dev mode button only visible when `import.meta.env.DEV`
- `deleteTestUser` validates `isTestUser` flag before deletion

### 3. Data Isolation
- Test users use Stripe test mode (no real charges)
- Test data is separate from production data
- All test data is cleaned up on sign out

### 4. Cleanup Mechanisms
1. **Manual**: `deleteTestUser` function
2. **Automatic**: Sign out handler in TopBar
3. **Scheduled**: `cleanupOldTestUsers` runs daily
4. **Test cleanup**: `afterEach` hooks in tests

### 5. Production Safety
- Test users cannot be created in production (requires dev secret)
- Dev mode button not visible in production builds
- Stripe test/live key separation prevents accidental charges

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   Test User Lifecycle                        │
└──────────────────────────────────────────────────────────────┘

CREATE PHASE
───────────────────────────────────────────────────────────────
Playwright/Dev Button
    ↓
createTestUser Cloud Function (requires DEV_MODE_SECRET)
    ↓
Firebase Auth User (email: test-*@divergent-todos-test.com)
    ↓
Firestore User Doc (isTestUser: true, createdAt: timestamp)
    ↓
Custom Token (for sign-in)


SIGN-IN PHASE
───────────────────────────────────────────────────────────────
Custom Token
    ↓
signInWithCustomToken(auth, token)
    ↓
onAuthStateChanged fires
    ↓
App loads user data
    ↓
Test Mode badge appears in TopBar (yellow badge next to logo)


USAGE PHASE
───────────────────────────────────────────────────────────────
User interacts with app
    ↓
Stripe functions check isTestUser flag
    ↓
If true → Use STRIPE_TEST_API_KEY
    ↓
Test mode operations (no real charges)


CLEANUP PHASE
───────────────────────────────────────────────────────────────
Sign Out / Test Cleanup / Scheduled Job
    ↓
deleteTestUser Cloud Function
    ↓
Verify isTestUser: true (safety check)
    ↓
Delete in batch:
    - todos collection (where userId == uid)
    - activity collection (where userId == uid)
    - profiles/{uid}
    - profiles/{uid}/payments/*
    - users/{uid}
    ↓
Delete from Firebase Auth
    ↓
User fully deleted
```

---

## Firestore Schema

### Test User Document
**Collection**: `users/{uid}`

```typescript
{
  email: "test-1234567890-abc123@divergent-todos-test.com",
  displayName: "Test User",
  isTestUser: true,              // ← KEY FLAG
  createdAt: Timestamp,
}
```

### Associated Data
Test users can create normal data:
- **todos**: Regular todo documents
- **activity**: Weekly activity summaries
- **profiles**: Subscription and settings
- **profiles/{uid}/payments**: Payment records

All marked for deletion when user is deleted.

---

## Common Patterns

### Pattern 1: Writing a New E2E Test

```typescript
import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, signInTestUser } from "./helpers/testUser";

test.describe("Feature Name", () => {
  let testUserId: string;

  test("should do something", async ({ page }) => {
    // Setup
    const testUser = await createTestUser(page);
    testUserId = testUser.uid;
    await signInTestUser(page, testUser.customToken);

    // Test
    await expect(page.getByText("Test Mode")).toBeVisible();
    // ... your test code ...
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    if (testUserId) {
      await deleteTestUser(page, testUserId);
    }
  });
});
```

### Pattern 2: Testing Subscription Flow

```typescript
test("should complete subscription flow", async ({ page }) => {
  const testUser = await createTestUser(page);
  testUserId = testUser.uid;
  await signInTestUser(page, testUser.customToken);

  // Navigate to subscription
  await page.getByRole("button", { name: "Subscribe" }).click();

  // Fill Stripe test card
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
  await stripeFrame.locator('[name="cardnumber"]').fill("4242424242424242");
  await stripeFrame.locator('[name="exp-date"]').fill("12/34");
  await stripeFrame.locator('[name="cvc"]').fill("123");
  await stripeFrame.locator('[name="postal"]').fill("12345");

  await page.getByRole("button", { name: "Submit" }).click();

  // Verify success
  await expect(page.getByText("Subscription Active")).toBeVisible({
    timeout: 10000
  });
});
```

### Pattern 3: Visual Regression Testing

```typescript
test("landing page visual regression", async ({ page }) => {
  await page.goto("/");

  // Take screenshot and compare with baseline
  await expect(page).toHaveScreenshot("landing-page.png", {
    maxDiffPixels: 100, // Allow small differences
  });
});
```

---

## Troubleshooting

### Test users not being deleted
**Check**:
1. Is `DEV_MODE_SECRET` set correctly?
2. Are Cloud Functions deployed?
3. Check Cloud Functions logs: `firebase functions:log`

### Stripe test mode not working
**Check**:
1. Is `STRIPE_TEST_API_KEY` secret set?
2. Verify user has `isTestUser: true` in Firestore
3. Check function logs for Stripe key selection

### Tests timing out
**Solutions**:
1. Increase `timeout` in test or config
2. Add more specific `waitFor` conditions
3. Check if dev server is running

### Visual regression failures
**Solutions**:
1. Review diffs: `pnpm exec playwright show-report`
2. Update baselines if changes are intentional: `pnpm exec playwright test --update-snapshots`

---

## Best Practices

1. **Always clean up test users** in `afterEach` hooks
2. **Run tests serially** to avoid conflicts (workers: 1)
3. **Use specific selectors** (test IDs, roles) instead of text
4. **Wait for network idle** after sign-in before asserting
5. **Use meaningful test descriptions** for debugging
6. **Take screenshots** on failure (automatic in config)
7. **Keep tests independent** - don't rely on execution order
8. **Use test data** that's easy to identify in logs

---

## Maintenance

### Monthly Tasks
- Review leaked test users in Firestore (should be none)
- Check scheduled cleanup function logs
- Update Playwright browsers: `pnpm exec playwright install`

### When Adding New Features
1. Add E2E test coverage
2. Update test utilities if needed
3. Ensure test users can access the feature
4. Add visual regression tests for UI changes

### When Modifying Cloud Functions
1. Ensure `isTestUser` checks remain intact
2. Test with both test and real users
3. Update E2E tests if function signatures change
4. Redeploy functions: `firebase deploy --only functions`

---

## Further Reading

- [Playwright Documentation](https://playwright.dev)
- [Firebase Functions Testing](https://firebase.google.com/docs/functions/local-emulator)
- [Stripe Testing](https://stripe.com/docs/testing)

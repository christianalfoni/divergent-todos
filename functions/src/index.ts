import { initializeApp } from "firebase-admin/app";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { OAuth2Client } from "google-auth-library";
import * as crypto from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import Stripe from "stripe";
import { logger } from "firebase-functions";
import { Resend } from "resend";

initializeApp();

const db = getFirestore();
const auth = getAuth();
const SESSIONS_COLLECTION = "authSessions";

// Session TTLs
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Define secrets (Firebase Secrets Manager)
const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const STRIPE_API_KEY = defineSecret("STRIPE_API_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_PRICE_ID = defineSecret("STRIPE_PRICE_ID");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const DEV_MODE_SECRET = defineSecret("DEV_MODE_SECRET");
const STRIPE_TEST_API_KEY = defineSecret("STRIPE_TEST_API_KEY");
const STRIPE_TEST_PRICE_ID = defineSecret("STRIPE_TEST_PRICE_ID");
const STRIPE_TEST_WEBHOOK_SECRET = defineSecret("STRIPE_TEST_WEBHOOK_SECRET");

interface AuthSession {
  sid: string;
  state: string;
  clientNonce: string;
  createdAt: number;
  used: boolean;
  customToken?: string;
  tokenCreatedAt?: number;
}

// OAuth2 client configuration
const getOAuth2Client = (clientId: string, clientSecret: string) => {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "https://us-central1-divergent-todos.cloudfunctions.net/authCallback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

/**
 * POST /authStart
 * Initiates OAuth flow by generating a state-bound session.
 * Input: { clientNonce }
 * Output: { authorizeUrl, sid }
 */
export const authStart = onRequest(
  {
    region: "us-central1",
    cors: ["*"],
    maxInstances: 10,
    secrets: [googleClientId, googleClientSecret],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      const { clientNonce } = req.body;

      if (!clientNonce || typeof clientNonce !== "string") {
        res.status(400).json({ error: "Missing or invalid clientNonce" });
        return;
      }

      // Generate unique session ID and state
      const sid = crypto.randomBytes(32).toString("base64url");
      const state = crypto.randomBytes(32).toString("base64url");

      // Store session
      const session: AuthSession = {
        sid,
        state,
        clientNonce,
        createdAt: Date.now(),
        used: false,
      };

      await db.collection(SESSIONS_COLLECTION).doc(sid).set(session);

      // Generate OAuth URL with state
      const oauth2Client = getOAuth2Client(
        googleClientId.value(),
        googleClientSecret.value()
      );
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        prompt: "select_account",
        state,
      });

      res.json({ authorizeUrl, sid });
    } catch (error) {
      console.error("Error in authStart:", error);
      res.status(500).json({ error: "Failed to initiate authentication" });
    }
  }
);

/**
 * GET /authCallback
 * OAuth callback from Google. Exchanges code for custom token.
 * Input: { code, state }
 * Side-effect: Stores one-time custom token in session
 * Redirects to: divergent-todos://auth/callback?sid=...
 */
export const authCallback = onRequest(
  {
    region: "us-central1",
    cors: true,
    maxInstances: 10,
    secrets: [googleClientId, googleClientSecret],
  },
  async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        throw new Error("Missing code or state parameter");
      }

      // Find session by state
      const sessionsSnapshot = await db
        .collection(SESSIONS_COLLECTION)
        .where("state", "==", state)
        .where("used", "==", false)
        .limit(1)
        .get();

      if (sessionsSnapshot.empty) {
        throw new Error("Invalid or expired state");
      }

      const sessionDoc = sessionsSnapshot.docs[0];
      const session = sessionDoc.data() as AuthSession;

      // Verify session not expired
      if (Date.now() - session.createdAt > SESSION_TTL_MS) {
        await sessionDoc.ref.delete();
        throw new Error("Session expired");
      }

      // Mark state as used (prevent replay)
      await sessionDoc.ref.update({ used: true });

      // Exchange code for tokens
      const oauth2Client = getOAuth2Client(
        googleClientId.value(),
        googleClientSecret.value()
      );
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.id_token) {
        throw new Error("No ID token returned from Google");
      }

      // Verify ID token
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: googleClientId.value(),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error("Invalid token payload");
      }

      const { email, name, picture } = payload;

      // Create or get Firebase user
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
      } catch (error) {
        userRecord = await auth.createUser({
          email,
          displayName: name,
          photoURL: picture,
          emailVerified: true,
        });
      }

      // Create custom token
      // Note: If you get "Permission 'iam.serviceAccounts.signBlob' denied",
      // run: gcloud iam service-accounts add-iam-policy-binding \
      //   PROJECT_ID@appspot.gserviceaccount.com \
      //   --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
      //   --role="roles/iam.serviceAccountTokenCreator"
      const customToken = await auth.createCustomToken(userRecord.uid);

      // Store token in session (single-use)
      await sessionDoc.ref.update({
        customToken,
        tokenCreatedAt: Date.now(),
        used: false, // Reset for exchange endpoint
      });

      // Redirect to app with sid only
      const deepLink = `divergent-todos://auth/callback?sid=${session.sid}`;

      // Render fallback page with auto-redirect
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting to Divergent Todos...</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light dark">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: rgb(249, 250, 251);
                color: rgb(17, 24, 39);
              }

              .container {
                background: rgb(255, 255, 255);
                border-radius: 12px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
                padding: 3rem 2rem;
                text-align: center;
                max-width: 400px;
                width: 90%;
              }

              .icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 1.5rem;
                background: rgb(238, 242, 255);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
              }

              h1 {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: rgb(17, 24, 39);
              }

              p {
                color: rgb(107, 114, 128);
                margin-bottom: 1.5rem;
                line-height: 1.5;
              }

              .button {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background: rgb(79, 70, 229);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 500;
                transition: background 0.2s;
              }

              .button:hover {
                background: rgb(99, 102, 241);
              }

              @media (prefers-color-scheme: dark) {
                body {
                  background: rgb(17, 24, 39);
                  color: rgb(255, 255, 255);
                }

                .container {
                  background: rgb(31, 41, 55);
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3);
                }

                .icon {
                  background: rgba(99, 102, 241, 0.1);
                }

                h1 {
                  color: rgb(255, 255, 255);
                }

                p {
                  color: rgb(156, 163, 175);
                }

                .button {
                  background: rgb(99, 102, 241);
                }

                .button:hover {
                  background: rgb(129, 140, 248);
                }
              }
            </style>
            <script>
              // Auto-redirect after 1 second
              setTimeout(() => {
                window.location.href = "${deepLink}";
              }, 1000);
            </script>
          </head>
          <body>
            <div class="container">
              <div class="icon">✓</div>
              <h1>Authentication Successful!</h1>
              <p>Returning to Divergent Todos...</p>
              <a href="${deepLink}" class="button">Click here if app doesn't open</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in authCallback:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Error</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light dark">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: rgb(249, 250, 251);
                color: rgb(17, 24, 39);
                padding: 1rem;
              }

              .error-box {
                background: rgb(255, 255, 255);
                border-radius: 12px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
                padding: 3rem 2rem;
                max-width: 500px;
                width: 100%;
              }

              .icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 1.5rem;
                background: rgb(254, 243, 199);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                text-align: center;
              }

              h1 {
                font-size: 1.5rem;
                font-weight: 600;
                color: rgb(220, 38, 38);
                margin-bottom: 1rem;
              }

              p {
                color: rgb(107, 114, 128);
                line-height: 1.6;
                margin-bottom: 0.75rem;
              }

              .error-detail {
                margin-top: 1.5rem;
                padding: 1rem;
                background: rgb(243, 244, 246);
                border-radius: 8px;
                border-left: 3px solid rgb(220, 38, 38);
              }

              .error-detail small {
                color: rgb(107, 114, 128);
                font-size: 0.875rem;
                font-family: monospace;
                word-break: break-word;
              }

              @media (prefers-color-scheme: dark) {
                body {
                  background: rgb(17, 24, 39);
                  color: rgb(255, 255, 255);
                }

                .error-box {
                  background: rgb(31, 41, 55);
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3);
                }

                .icon {
                  background: rgba(245, 158, 11, 0.1);
                }

                h1 {
                  color: rgb(248, 113, 113);
                }

                p {
                  color: rgb(156, 163, 175);
                }

                .error-detail {
                  background: rgb(55, 65, 81);
                  border-left-color: rgb(248, 113, 113);
                }

                .error-detail small {
                  color: rgb(156, 163, 175);
                }
              }
            </style>
          </head>
          <body>
            <div class="error-box">
              <div class="icon">⚠</div>
              <h1>Authentication Failed</h1>
              <p>There was an error signing you in. Please close this window and try again.</p>
              <div class="error-detail">
                <small>Error: ${
                  error instanceof Error ? error.message : "Unknown error"
                }</small>
              </div>
            </div>
          </body>
        </html>
      `);
    }
  }
);

/**
 * POST /authExchange
 * Exchanges session ID for one-time custom token.
 * Input: { sid, clientNonce }
 * Output: { customToken }
 */
export const authExchange = onRequest(
  {
    region: "us-central1",
    cors: ["*"],
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      const { sid, clientNonce } = req.body;

      if (!sid || !clientNonce) {
        res.status(400).json({ error: "Missing sid or clientNonce" });
        return;
      }

      // Fetch session
      const sessionDoc = await db
        .collection(SESSIONS_COLLECTION)
        .doc(sid)
        .get();

      if (!sessionDoc.exists) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      const session = sessionDoc.data() as AuthSession;

      // Verify clientNonce matches
      if (session.clientNonce !== clientNonce) {
        res.status(403).json({ error: "Client nonce mismatch" });
        return;
      }

      // Verify not already used
      if (session.used) {
        res.status(403).json({ error: "Token already used" });
        return;
      }

      // Verify token exists and not expired
      if (!session.customToken || !session.tokenCreatedAt) {
        res.status(404).json({ error: "Token not ready" });
        return;
      }

      if (Date.now() - session.tokenCreatedAt > TOKEN_TTL_MS) {
        await sessionDoc.ref.delete();
        res.status(403).json({ error: "Token expired" });
        return;
      }

      // Mark as used and return token
      await sessionDoc.ref.update({ used: true });

      res.json({ customToken: session.customToken });

      // Clean up session after response (don't await)
      sessionDoc.ref.delete().catch(console.error);
    } catch (error) {
      console.error("Error in authExchange:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  }
);

// ============================================================================
// Test User Management (for E2E Testing)
// ============================================================================

/**
 * createTestUser
 * Creates a test user for E2E testing and returns a custom token for sign-in.
 * Requires DEV_MODE_SECRET for security.
 */
export const createTestUser = onCall(
  {
    region: "us-central1",
    cors: ["*"],
    maxInstances: 10,
    secrets: [DEV_MODE_SECRET],
  },
  async (req) => {
    try {
      // Security: Require dev-mode secret
      const devSecret = req.data?.devSecret;
      if (devSecret !== DEV_MODE_SECRET.value()) {
        throw new HttpsError(
          "permission-denied",
          "Invalid dev secret"
        );
      }

      const testUserId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const email = `${testUserId}@divergent-todos-test.com`;

      // Create in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        emailVerified: true,
        displayName: "Test User",
      });

      // Set custom claim for test user flag
      await auth.setCustomUserClaims(userRecord.uid, {
        isTestUser: true,
      });

      // Create profile document (following app's schema)
      await db.collection("profiles").doc(userRecord.uid).set({
        createdAt: Timestamp.now(),
        // Don't set isTestUser here - it's in custom claims only
      });

      // Generate custom token for sign-in
      const customToken = await auth.createCustomToken(userRecord.uid, {
        isTestUser: true,
      });

      logger.info("Test user created successfully", {
        uid: userRecord.uid,
        email,
      });

      return {
        uid: userRecord.uid,
        customToken,
        email,
      };
    } catch (error) {
      logger.error("Failed to create test user", error);
      throw new HttpsError(
        "internal",
        `Failed to create test user: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * deleteTestUser
 * Deletes a test user and all associated data.
 * Safety check: Only deletes users marked with isTestUser flag.
 */
export const deleteTestUser = onCall(
  {
    region: "us-central1",
    cors: ["*"],
    maxInstances: 10,
  },
  async (req) => {
    try {
      const { uid } = req.data;

      if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required");
      }

      // Safety check: verify it's actually a test user by checking custom claims
      const userRecord = await auth.getUser(uid);
      const customClaims = userRecord.customClaims || {};

      if (!customClaims.isTestUser) {
        throw new HttpsError(
          "permission-denied",
          "Cannot delete non-test user"
        );
      }

      // Delete user data from Firestore
      const batch = db.batch();

      // Delete todos
      const todos = await db.collection("todos")
        .where("userId", "==", uid)
        .get();
      todos.docs.forEach((doc) => batch.delete(doc.ref));

      // Delete activity
      const activity = await db.collection("activity")
        .where("userId", "==", uid)
        .get();
      activity.docs.forEach((doc) => batch.delete(doc.ref));

      // Delete profile
      const profileDoc = db.collection("profiles").doc(uid);
      batch.delete(profileDoc);

      // Delete payments subcollection
      const payments = await db.collection(`profiles/${uid}/payments`).get();
      payments.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      // Delete from Firebase Auth
      await auth.deleteUser(uid);

      logger.info("Test user deleted successfully", { uid });

      return { success: true };
    } catch (error) {
      logger.error("Failed to delete test user", error);
      throw new HttpsError(
        "internal",
        `Failed to delete test user: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// ============================================================================
// Stripe Subscription Functions
// ============================================================================

const stripeFrom = (key: string) =>
  new Stripe(key, { apiVersion: "2025-09-30.clover" });

/** Create or reuse a Customer and store customerId in profiles/{uid}.subscription */
async function getOrCreateCustomer(
  stripe: Stripe,
  uid: string,
  email?: string | null
): Promise<string> {
  const ref = db.doc(`profiles/${uid}`);
  const snap = await ref.get();
  const sub = snap.exists ? (snap.data()?.subscription ?? {}) : {};

  if (sub?.customerId) return sub.customerId as string;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { firebaseUID: uid },
  });

  await ref.set(
    {
      subscription: {
        customerId: customer.id,
        subscriptionId: null,
        status: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    },
    { merge: true }
  );

  return customer.id;
}

async function writeSubscription(uid: string, sub: Stripe.Subscription) {
  const ref = db.doc(`profiles/${uid}`);
  await ref.set(
    {
      subscription: {
        customerId: sub.customer.toString(),
        subscriptionId: sub.id,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        currentPeriodEnd: (sub as any).current_period_end
          ? Timestamp.fromMillis((sub as any).current_period_end * 1000)
          : null,
      },
    },
    { merge: true }
  );
}

async function writePayment(uid: string, invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  const paymentId = (invoiceAny.payment_intent?.toString() || invoice.id) as string;
  const ref = db.doc(`profiles/${uid}/payments/${paymentId}`);
  const line = invoice.lines?.data?.[0];
  const period = line?.period;

  await ref.set(
    {
      amount: invoice.amount_paid,
      currency: invoice.currency,
      invoiceId: invoice.id,
      paymentIntentId: invoiceAny.payment_intent ?? null,
      subscriptionId: invoiceAny.subscription ?? null,
      created: Timestamp.fromMillis(invoice.created * 1000),
      periodStart: period?.start
        ? Timestamp.fromMillis(period.start * 1000)
        : null,
      periodEnd: period?.end
        ? Timestamp.fromMillis(period.end * 1000)
        : null,
      status: invoice.status,
      description: line?.description ?? null,
    },
    { merge: true }
  );
}

/** === Callable Functions === */

export const createSubscription = onCall(
  { secrets: [STRIPE_API_KEY, STRIPE_TEST_API_KEY, STRIPE_PRICE_ID, STRIPE_TEST_PRICE_ID] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    // Check if test user via auth token custom claims
    const isTestUser = req.auth?.token?.isTestUser === true;

    // Use appropriate Stripe key and price ID
    const stripeApiKey = isTestUser
      ? STRIPE_TEST_API_KEY.value()
      : STRIPE_API_KEY.value();
    const priceId = isTestUser
      ? STRIPE_TEST_PRICE_ID.value()
      : STRIPE_PRICE_ID.value();

    const stripe = stripeFrom(stripeApiKey);
    if (!priceId) throw new HttpsError("failed-precondition", "Missing price.");

    const email = req.auth?.token?.email ?? null;
    const customerId = await getOrCreateCustomer(stripe, uid, email);

    // Validate URLs - only accept HTTPS URLs or use defaults
    const isValidUrl = (url: string | undefined) => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    };

    const successUrl = isValidUrl(req.data?.successUrl)
      ? req.data.successUrl
      : "https://divergent-todos.com/billing/success";
    const cancelUrl = isValidUrl(req.data?.cancelUrl)
      ? req.data.cancelUrl
      : "https://divergent-todos.com/billing/cancel";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: uid,
      subscription_data: { metadata: { firebaseUID: uid } },
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl,
    });

    return { url: session.url };
  }
);

export const createBillingPortal = onCall(
  { secrets: [STRIPE_API_KEY, STRIPE_TEST_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    // Check if test user via auth token custom claims
    const isTestUser = req.auth?.token?.isTestUser === true;

    // Use appropriate Stripe key
    const stripeApiKey = isTestUser
      ? STRIPE_TEST_API_KEY.value()
      : STRIPE_API_KEY.value();

    const stripe = stripeFrom(stripeApiKey);
    const snap = await db.doc(`profiles/${uid}`).get();
    const customerId = snap.data()?.subscription?.customerId as string | undefined;
    if (!customerId) throw new HttpsError("failed-precondition", "No customer.");

    // Validate URL - only accept HTTPS URLs or use default
    const isValidUrl = (url: string | undefined) => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    };

    const returnUrl = isValidUrl(req.data?.returnUrl)
      ? req.data.returnUrl
      : "https://divergent-todos.com/account";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: portal.url };
  }
);

export const stopSubscription = onCall(
  { secrets: [STRIPE_API_KEY, STRIPE_TEST_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    // Check if test user via auth token custom claims
    const isTestUser = req.auth?.token?.isTestUser === true;

    // Use appropriate Stripe key
    const stripeApiKey = isTestUser
      ? STRIPE_TEST_API_KEY.value()
      : STRIPE_API_KEY.value();

    const stripe = stripeFrom(stripeApiKey);
    const snap = await db.doc(`profiles/${uid}`).get();
    const subId = snap.data()?.subscription?.subscriptionId as string | undefined;
    if (!subId) throw new HttpsError("failed-precondition", "No subscription.");

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });

    await writeSubscription(uid, updated);
    return { status: updated.status, cancelAtPeriodEnd: true };
  }
);

export const resumeSubscription = onCall(
  { secrets: [STRIPE_API_KEY, STRIPE_TEST_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    // Check if test user via auth token custom claims
    const isTestUser = req.auth?.token?.isTestUser === true;

    // Use appropriate Stripe key
    const stripeApiKey = isTestUser
      ? STRIPE_TEST_API_KEY.value()
      : STRIPE_API_KEY.value();

    const stripe = stripeFrom(stripeApiKey);
    const snap = await db.doc(`profiles/${uid}`).get();
    const subId = snap.data()?.subscription?.subscriptionId as string | undefined;
    if (!subId) throw new HttpsError("failed-precondition", "No subscription.");

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: false,
    });

    await writeSubscription(uid, updated);
    return { status: updated.status, cancelAtPeriodEnd: false };
  }
);

/** === Webhook helpers === */
async function uidFromSubscription(stripe: Stripe, sub: Stripe.Subscription): Promise<string | undefined> {
  if (sub.metadata?.firebaseUID) return sub.metadata.firebaseUID as string;
  const cust = await stripe.customers.retrieve(sub.customer.toString());
  if (!("deleted" in cust) && cust.metadata?.firebaseUID) {
    const uid = cust.metadata.firebaseUID as string;
    await stripe.subscriptions.update(sub.id, {
      metadata: { ...(sub.metadata ?? {}), firebaseUID: uid },
    });
    return uid;
  }
  return undefined;
}

async function uidFromCheckoutSession(
  stripe: Stripe,
  s: Stripe.Checkout.Session
) {
  let uid = s.client_reference_id as string | undefined;
  let subscription: Stripe.Subscription | null = null;

  if (s.subscription) {
    subscription = await stripe.subscriptions.retrieve(s.subscription.toString());
    uid =
      (subscription.metadata?.firebaseUID as string | undefined) ??
      uid ??
      undefined;

    if (!uid && s.customer) {
      const cust = await stripe.customers.retrieve(s.customer.toString());
      if (!("deleted" in cust) && cust.metadata?.firebaseUID) {
        uid = cust.metadata.firebaseUID as string;
        await stripe.subscriptions.update(subscription.id, {
          metadata: { ...(subscription.metadata ?? {}), firebaseUID: uid },
        });
      }
    }
  }
  return { uid, subscription };
}

/** === Webhook === */
export const stripeWebhook = onRequest(
  {
    secrets: [
      STRIPE_API_KEY,
      STRIPE_WEBHOOK_SECRET,
      STRIPE_TEST_API_KEY,
      STRIPE_TEST_WEBHOOK_SECRET
    ]
  },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).send("Missing stripe-signature");
      return;
    }

    // Try to verify signature with both test and live secrets
    let event: Stripe.Event | null = null;
    let isTestMode = false;

    // Try live mode first
    try {
      const liveStripe = stripeFrom(STRIPE_API_KEY.value());
      event = liveStripe.webhooks.constructEvent(
        req.rawBody,
        sig as string,
        STRIPE_WEBHOOK_SECRET.value()
      );
      isTestMode = false;
      logger.info("Webhook verified with live mode secret");
    } catch (liveErr: any) {
      // Try test mode
      try {
        const testStripe = stripeFrom(STRIPE_TEST_API_KEY.value());
        event = testStripe.webhooks.constructEvent(
          req.rawBody,
          sig as string,
          STRIPE_TEST_WEBHOOK_SECRET.value()
        );
        isTestMode = true;
        logger.info("Webhook verified with test mode secret");
      } catch (testErr: any) {
        logger.error("Invalid signature for both test and live modes", {
          liveError: liveErr?.message,
          testError: testErr?.message,
        });
        res.status(400).send(`Webhook Error: Invalid signature`);
        return;
      }
    }

    if (!event) {
      res.status(400).send("Failed to construct event");
      return;
    }

    // Use appropriate Stripe instance based on detected mode
    const stripe = stripeFrom(
      isTestMode ? STRIPE_TEST_API_KEY.value() : STRIPE_API_KEY.value()
    );

    try {
      logger.info("Processing webhook event", {
        type: event.type,
        mode: isTestMode ? "test" : "live",
        eventId: event.id,
      });

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const { uid, subscription } = await uidFromCheckoutSession(stripe, session);
          if (uid && subscription) await writeSubscription(uid, subscription);
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const uid = await uidFromSubscription(stripe, sub);
          if (uid) await writeSubscription(uid, sub);
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const invoiceAny = invoice as any;
          let uid: string | undefined;
          if (invoiceAny.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoiceAny.subscription.toString());
            uid = (sub.metadata?.firebaseUID as string | undefined);
            if (!uid && invoice.customer) {
              const cust = await stripe.customers.retrieve(invoice.customer.toString());
              if (!("deleted" in cust) && cust.metadata?.firebaseUID) {
                uid = cust.metadata.firebaseUID as string;
              }
            }
          } else if (invoice.customer) {
            const cust = await stripe.customers.retrieve(invoice.customer.toString());
            if (!("deleted" in cust) && cust.metadata?.firebaseUID) {
              uid = cust.metadata.firebaseUID as string;
            }
          }
          if (uid) await writePayment(uid, invoice);
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      logger.error("Webhook handler error", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

// ============================================================================
// AI Summary Generation
// ============================================================================

import {
  getTodosForWeek,
  getWeekDateRange,
  getPreviousWeekSummary,
  getUserAccountCreationDate,
} from "./lib/activity-data.js";
import { generateSummarySync } from "./lib/openai-sync.js";
import { buildSummaryPrompt } from "./lib/openai-prompt.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

export const getSummaryData = onCall(
  {},
  async (req) => {
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized getSummaryData attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { userId, week, year } = req.data;

    if (!userId || !week) {
      throw new HttpsError("invalid-argument", "userId and week are required");
    }

    const targetYear = year || new Date().getFullYear();

    logger.info("Getting summary data", {
      userId,
      week,
      year: targetYear,
    });

    try {
      // Calculate date range for the week
      const { start: weekStart, end: weekEnd } = getWeekDateRange(targetYear, week);

      // Query all todos (completed and incomplete)
      const { completedTodos, incompleteTodos } = await getTodosForWeek(
        db,
        userId,
        week,
        targetYear
      );

      // Get previous week's summary for continuity
      const previousWeekSummary = await getPreviousWeekSummary(
        db,
        userId,
        week,
        targetYear
      );

      // Get user's account creation date
      const accountCreationDate = await getUserAccountCreationDate(userId);

      // Build the prompt to show the formatted data that would be sent to OpenAI
      const fullPrompt = buildSummaryPrompt(
        completedTodos,
        incompleteTodos,
        week,
        targetYear,
        undefined, // No custom instructions - just show the default
        previousWeekSummary,
        accountCreationDate
      );

      logger.info("Summary data retrieved successfully", {
        completedCount: completedTodos.length,
        incompleteCount: incompleteTodos.length,
        hasPreviousSummary: !!previousWeekSummary,
        hasAccountCreationDate: !!accountCreationDate,
      });

      return {
        success: true,
        week,
        year: targetYear,
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        completedTodos,
        incompleteTodos,
        previousWeekSummary,
        accountCreationDate,
        fullPrompt, // The complete formatted prompt with data and instructions
      };
    } catch (error) {
      logger.error("Error in getSummaryData", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Failed to get summary data: ${error}`);
    }
  }
);

export const generateWeekSummary = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (req) => {
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized generateWeekSummary attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { userId, week, year, customAnalysisInstructions } = req.data;

    if (!userId || !week) {
      throw new HttpsError("invalid-argument", "userId and week are required");
    }

    const targetYear = year || new Date().getFullYear();

    logger.info("Starting generateWeekSummary", {
      userId,
      week,
      year: targetYear,
      hasCustomInstructions: !!customAnalysisInstructions
    });

    try {
      // Calculate date range for the week
      const { start: weekStart, end: weekEnd } = getWeekDateRange(targetYear, week);

      logger.info("Calculated week date range", {
        week,
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
      });

      // Query all todos (completed and incomplete) using shared module
      logger.info("Querying todos collection...");
      const { completedTodos, incompleteTodos } = await getTodosForWeek(
        db,
        userId,
        week,
        targetYear
      );

      logger.info("Todos query completed", {
        completedCount: completedTodos.length,
        incompleteCount: incompleteTodos.length,
      });

      if (completedTodos.length === 0) {
        logger.warn("No completed todos found for this week");
        throw new HttpsError(
          "not-found",
          `No completed todos found for user ${userId}, week ${week}, year ${targetYear}`
        );
      }

      logger.info("Built activity data", {
        totalCompleted: completedTodos.length,
        totalIncomplete: incompleteTodos.length,
        sampleCompletedTodos: completedTodos.slice(0, 3),
      });

      // Get previous week's summary for continuity
      logger.info("Querying previous week summary...");
      const previousWeekSummary = await getPreviousWeekSummary(
        db,
        userId,
        week,
        targetYear
      );

      if (previousWeekSummary) {
        logger.info("Found previous week summary for continuity context");
      } else {
        logger.info("No previous week summary found");
      }

      // Get user's account creation date
      logger.info("Fetching user account creation date...");
      const accountCreationDate = await getUserAccountCreationDate(userId);

      if (accountCreationDate) {
        logger.info("User account created on:", accountCreationDate);
      } else {
        logger.info("Could not determine account creation date");
      }

      // Generate AI summaries using shared sync module
      logger.info("Calling OpenAI API...");
      const result = await generateSummarySync(
        OPENAI_API_KEY.value(),
        completedTodos,
        incompleteTodos,
        week,
        targetYear,
        customAnalysisInstructions,
        previousWeekSummary,
        accountCreationDate
      );

      logger.info("AI summary generated successfully", {
        formalLength: result.formalSummary.length,
      });

      // Calculate month from week start date
      const month = weekStart.getMonth();

      // Create or update activity document
      const activityDocId = `${userId}_${targetYear}_${week}`;
      const activityRef = db.collection("activity").doc(activityDocId);

      logger.info("Writing activity document...", { docId: activityDocId });

      await activityRef.set({
        userId,
        year: targetYear,
        week,
        month,
        completedTodos,
        incompleteCount: incompleteTodos.length,
        aiSummary: result.formalSummary,
        aiSummaryGeneratedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info("Successfully created/updated activity document");

      return {
        success: true,
        docId: activityDocId,
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        totalTodos: completedTodos.length,
        formalSummary: result.formalSummary,
      };
    } catch (error) {
      logger.error("Error in generateWeekSummary", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Failed to generate summary: ${error}`);
    }
  }
);

// ============================================================================
// Scheduled AI Summary Generation
// ============================================================================

export { generateWeeklySummaries } from "./generateWeeklySummaries.js";
export { checkAndConsumeBatch } from "./checkAndConsumeBatch.js";
export { triggerWeeklySummaries } from "./triggerWeeklySummaries.js";
export { checkBatchStatus } from "./checkBatchStatus.js";
export { consumeBatch } from "./consumeBatch.js";
export { listBatchJobs, getBatchJobDetails } from "./listBatchJobs.js";

// ============================================================================
// Feedback Function
// ============================================================================

export const submitFeedback = onCall(
  { secrets: [RESEND_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    const { feedback } = req.data;
    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      throw new HttpsError("invalid-argument", "Feedback is required.");
    }

    const email = req.auth?.token?.email || "anonymous";
    const displayName = req.auth?.token?.name || "Anonymous User";

    try {
      const resend = new Resend(RESEND_API_KEY.value());

      await resend.emails.send({
        from: "post@divergent-todos.com",
        to: "christianalfoni@gmail.com",
        subject: "Feedback",
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>From:</strong> ${displayName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>User ID:</strong> ${uid}</p>
          <h3>Feedback:</h3>
          <p>${feedback.replace(/\n/g, "<br>")}</p>
        `,
      });

      logger.info("Feedback sent successfully", { uid, email });
      return { success: true };
    } catch (error) {
      logger.error("Failed to send feedback email", error);
      throw new HttpsError("internal", "Failed to send feedback. Please try again later.");
    }
  }
);

// ============================================================================
// Scheduled Test User Cleanup (Safety Net)
// ============================================================================

import { onSchedule } from "firebase-functions/v2/scheduler";

/**
 * cleanupOldTestUsers
 * Runs daily at 2 AM to clean up test users older than 24 hours.
 * This is a safety net to prevent test user leaks from failed tests.
 */
export const cleanupOldTestUsers = onSchedule(
  {
    schedule: "0 2 * * *", // Daily at 2 AM
    timeZone: "America/New_York",
    region: "us-central1",
  },
  async () => {
    try {
      const now = Timestamp.now();
      const oneDayAgo = new Timestamp(
        now.seconds - 86400, // 24 hours
        now.nanoseconds
      );

      logger.info("Starting cleanup of old test users", {
        cutoffTime: oneDayAgo.toDate().toISOString(),
      });

      // List all users and check custom claims (since we can't query custom claims directly)
      const listUsersResult = await auth.listUsers();
      const testUsers = listUsersResult.users.filter(user => {
        const claims = user.customClaims || {};
        return claims.isTestUser === true;
      });

      logger.info(`Found ${testUsers.length} test users, checking age...`);

      let cleanedCount = 0;
      for (const user of testUsers) {
        try {
          const uid = user.uid;

          // Check age by looking at profile creation date
          const profileDoc = await db.collection("profiles").doc(uid).get();
          if (!profileDoc.exists) {
            logger.warn(`Profile not found for test user ${uid}, skipping`);
            continue;
          }

          const createdAt = profileDoc.data()?.createdAt;
          if (!createdAt) {
            logger.warn(`No createdAt for test user ${uid}, skipping`);
            continue;
          }

          // Skip if less than 24 hours old
          const createdTimestamp = createdAt.toMillis ? createdAt.toMillis() : createdAt.seconds * 1000;
          if (createdTimestamp >= oneDayAgo.seconds * 1000) {
            continue;
          }

          logger.info(`Cleaning up old test user ${uid}`);

          // Delete user data
          const batch = db.batch();

          const todos = await db
            .collection("todos")
            .where("userId", "==", uid)
            .get();
          todos.docs.forEach((d) => batch.delete(d.ref));

          const activity = await db
            .collection("activity")
            .where("userId", "==", uid)
            .get();
          activity.docs.forEach((d) => batch.delete(d.ref));

          // Delete profile
          const profileRef = db.collection("profiles").doc(uid);
          batch.delete(profileRef);

          // Delete payments subcollection
          const payments = await db.collection(`profiles/${uid}/payments`).get();
          payments.docs.forEach((d) => batch.delete(d.ref));

          await batch.commit();

          // Delete from Auth
          await auth.deleteUser(uid);

          cleanedCount++;
          logger.info(`Successfully deleted test user: ${uid}`);
        } catch (error) {
          logger.error(`Failed to delete test user ${user.uid}`, error);
        }
      }

      logger.info(`Test user cleanup completed - cleaned ${cleanedCount} users`);
    } catch (error) {
      logger.error("Error in cleanupOldTestUsers", error);
    }
  }
);

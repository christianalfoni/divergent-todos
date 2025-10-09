import { initializeApp } from "firebase-admin/app";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { OAuth2Client } from "google-auth-library";
import * as crypto from "crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import Stripe from "stripe";
import { logger } from "firebase-functions";

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
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              .icon { font-size: 3rem; margin-bottom: 1rem; }
              h1 { margin: 0 0 1rem 0; }
              p { margin: 0.5rem 0; opacity: 0.9; }
              .button {
                display: inline-block;
                margin-top: 1.5rem;
                padding: 0.75rem 1.5rem;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                transition: transform 0.2s;
              }
              .button:hover { transform: scale(1.05); }
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
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .error-box {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              h1 { color: #d32f2f; margin-top: 0; }
              p { color: #666; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <h1>Authentication Failed</h1>
              <p>There was an error signing you in. Please close this window and try again.</p>
              <p><small>Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }</small></p>
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
  { secrets: [STRIPE_API_KEY, STRIPE_PRICE_ID] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    const stripe = stripeFrom(STRIPE_API_KEY.value());
    const priceId = STRIPE_PRICE_ID.value();
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
  { secrets: [STRIPE_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    const stripe = stripeFrom(STRIPE_API_KEY.value());
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
  { secrets: [STRIPE_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    const stripe = stripeFrom(STRIPE_API_KEY.value());
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
  { secrets: [STRIPE_API_KEY] },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");

    const stripe = stripeFrom(STRIPE_API_KEY.value());
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
  { secrets: [STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const stripe = stripeFrom(STRIPE_API_KEY.value());
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).send("Missing stripe-signature");
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig as string,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err: any) {
      logger.error("Invalid signature", err?.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
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

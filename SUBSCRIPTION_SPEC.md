Perfect — removing Stripe trials makes the setup leaner.
Here’s the final, production-ready version of your Firebase × Stripe integration:

✅ Everything lives under profiles/{uid}
✅ No trial handling
✅ No reverse lookup (uses Stripe metadata)
✅ Single fixed monthly plan
✅ Clean separation: subscription fields on profiles/{uid}, payments under profiles/{uid}/payments

⸻

🗄 Firestore structure

profiles/{uid}
subscription:
customerId: string
subscriptionId: string | null
status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | null
currentPeriodEnd: Timestamp | null
cancelAtPeriodEnd: boolean

profiles/{uid}/payments/{paymentId}
amount: number
currency: string
invoiceId: string
paymentIntentId: string | null
subscriptionId: string | null
created: Timestamp
periodStart: Timestamp | null
periodEnd: Timestamp | null
status: string
description: string | null

⸻

⚙️ Cloud Functions (TypeScript)

functions/src/index.ts

import \* as admin from "firebase-admin";
import Stripe from "stripe";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

admin.initializeApp();

const STRIPE_API_KEY = defineSecret("STRIPE_API_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_PRICE_ID = defineSecret("STRIPE_PRICE_ID");

const stripeFrom = (key: string) =>
new Stripe(key, { apiVersion: "2024-06-20" });

/\*_ Create or reuse a Customer and store customerId in profiles/{uid}.subscription _/
async function getOrCreateCustomer(
stripe: Stripe,
uid: string,
email?: string | null
): Promise<string> {
const ref = admin.firestore().doc(`profiles/${uid}`);
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
const ref = admin.firestore().doc(`profiles/${uid}`);
await ref.set(
{
subscription: {
customerId: sub.customer.toString(),
subscriptionId: sub.id,
status: sub.status,
cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
currentPeriodEnd: sub.current_period_end
? admin.firestore.Timestamp.fromMillis(sub.current_period_end \* 1000)
: null,
},
},
{ merge: true }
);
}

async function writePayment(uid: string, invoice: Stripe.Invoice) {
const paymentId = (invoice.payment_intent?.toString() || invoice.id) as string;
const ref = admin.firestore().doc(`profiles/${uid}/payments/${paymentId}`);
const line = invoice.lines?.data?.[0];
const period = line?.period;

await ref.set(
{
amount: invoice.amount*paid,
currency: invoice.currency,
invoiceId: invoice.id,
paymentIntentId: invoice.payment_intent ?? null,
subscriptionId: invoice.subscription ?? null,
created: admin.firestore.Timestamp.fromMillis(invoice.created * 1000),
periodStart: period?.start
? admin.firestore.Timestamp.fromMillis(period.start \_ 1000)
: null,
periodEnd: period?.end
? admin.firestore.Timestamp.fromMillis(period.end \* 1000)
: null,
status: invoice.status,
description: line?.description ?? null,
},
{ merge: true }
);
}

/** === Callable Functions === **/

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

    const successUrl = req.data?.successUrl || "https://divergent-todos.com/billing/success";
    const cancelUrl = req.data?.cancelUrl || "https://divergent-todos.com/billing/cancel";

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
    const snap = await admin.firestore().doc(`profiles/${uid}`).get();
    const customerId = snap.data()?.subscription?.customerId as string | undefined;
    if (!customerId) throw new HttpsError("failed-precondition", "No customer.");

    const returnUrl = req.data?.returnUrl || "https://divergent-todos.com/account";
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
    const snap = await admin.firestore().doc(`profiles/${uid}`).get();
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
    const snap = await admin.firestore().doc(`profiles/${uid}`).get();
    const subId = snap.data()?.subscription?.subscriptionId as string | undefined;
    if (!subId) throw new HttpsError("failed-precondition", "No subscription.");

    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: false,
    });

    await writeSubscription(uid, updated);
    return { status: updated.status, cancelAtPeriodEnd: false };

}
);

/** === Webhook helpers === **/
async function uidFromSubscription(stripe: Stripe, sub: Stripe.Subscription) {
if (sub.metadata?.firebaseUID) return sub.metadata.firebaseUID as string;
const cust = await stripe.customers.retrieve(sub.customer.toString());
if (!("deleted" in cust) && cust.metadata?.firebaseUID) {
const uid = cust.metadata.firebaseUID as string;
await stripe.subscriptions.update(sub.id, {
metadata: { ...(sub.metadata ?? {}), firebaseUID: uid },
});
return uid;
}
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

/** === Webhook === **/
export const stripeWebhook = onRequest(
{ secrets: [STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET] },
async (req, res) => {
const stripe = stripeFrom(STRIPE_API_KEY.value());
const sig = req.headers["stripe-signature"];
if (!sig) return res.status(400).send("Missing stripe-signature");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig as string,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err: any) {
      logger.error("Invalid signature", err?.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
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
          let uid: string | undefined;
          if (invoice.subscription) {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription.toString());
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

⸻

🔒 Firestore rules

rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /profiles/{uid} {
allow read: if request.auth != null && request.auth.uid == uid;
// Allow clients to update profile fields, but protect 'subscription' field
allow create, update: if request.auth != null
        && request.auth.uid == uid
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscription']));
allow delete: if false;

      match /payments/{pid} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if false; // Cloud Functions only
      }
    }

}
}

Note: The subscription field can only be written by Cloud Functions using Admin SDK (bypasses security rules).
Clients can freely update other profile fields like theme, displayName, etc.

⸻

🧩 Client calls

import { getFunctions, httpsCallable } from "firebase/functions";
const fns = getFunctions();

export async function startSubscription() {
const fn = httpsCallable(fns, "createSubscription");
const { data } = await fn({
successUrl: window.location.origin + "/billing/success",
cancelUrl: window.location.origin + "/billing/cancel",
});
window.location.href = (data as any).url;
}

export async function openBillingPortal() {
const fn = httpsCallable(fns, "createBillingPortal");
const { data } = await fn({ returnUrl: window.location.origin + "/account" });
window.location.href = (data as any).url;
}

export async function stopSubscription() {
await httpsCallable(fns, "stopSubscription")();
}

export async function resumeSubscription() {
await httpsCallable(fns, "resumeSubscription")();
}

⸻

🚀 Deploy & connect Stripe webhook

# 1. Set all required secrets first
firebase functions:secrets:set STRIPE_API_KEY
firebase functions:secrets:set STRIPE_PRICE_ID
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# 2. Deploy functions
firebase deploy --only functions

# 3. Configure Stripe webhook
Then in Stripe → Developers → Webhooks:
• Add your deployed stripeWebhook URL (e.g., https://us-central1-<project>.cloudfunctions.net/stripeWebhook)
• Subscribe to these events:
  • checkout.session.completed
  • customer.subscription.created
  • customer.subscription.updated
  • customer.subscription.deleted
  • invoice.paid
• Copy the webhook signing secret and update:
  firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

⸻

📝 Implementation Notes

• **Idempotency**: All webhook handlers are naturally idempotent (safe to retry). Firestore writes use set() with merge:true, so duplicate webhook calls won't cause issues.
• **Error handling**: Stripe automatically retries failed webhooks with exponential backoff.
• **Metadata strategy**: Firebase UIDs stored in Stripe metadata for reverse lookups from webhooks.
• **Single tier**: App intentionally supports only one subscription tier for simplicity.

⸻

✅ Result:
• Everything under profiles/{uid}
• No trials, no reverse lookup complexity
• Stripe → Firestore sync for subscription + payments
• Simple stop/resume + portal support
• Single monthly subscription plan

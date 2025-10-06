# Stripe Subscription Deployment Guide

This guide covers the steps needed to deploy and configure the Stripe subscription system for Divergent Todos.

## Prerequisites

- Firebase project with billing enabled
- Stripe account
- Firebase CLI installed (`npm install -g firebase-tools`)
- Authenticated with Firebase CLI (`firebase login`)

## Step 1: Configure Stripe Secrets

Before deploying functions, you need to set three required secrets in Firebase:

### 1.1 Set STRIPE_API_KEY

Get your Stripe Secret Key from [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys).

```bash
firebase functions:secrets:set STRIPE_API_KEY
# Paste your Stripe secret key when prompted (starts with sk_)
```

### 1.2 Set STRIPE_PRICE_ID

Create a monthly subscription product in Stripe:
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add Product"
3. Set product name (e.g., "Divergent Todos Monthly")
4. Choose "Recurring" pricing
5. Set price and billing period (e.g., $9.99/month)
6. Click "Save product"
7. Copy the Price ID (starts with `price_`)

```bash
firebase functions:secrets:set STRIPE_PRICE_ID
# Paste your Price ID when prompted
```

### 1.3 Set STRIPE_WEBHOOK_SECRET (Placeholder)

Set a temporary placeholder value - we'll update this after deployment:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Enter any temporary value (e.g., "placeholder")
```

## Step 2: Deploy Firebase Functions

Deploy all functions including the new subscription functions:

```bash
firebase deploy --only functions
```

This will deploy:
- `createSubscription` - Initiates Stripe Checkout
- `createBillingPortal` - Opens Stripe Customer Portal
- `stopSubscription` - Cancels subscription at period end
- `resumeSubscription` - Resumes a cancelled subscription
- `stripeWebhook` - Handles Stripe webhook events

## Step 3: Deploy Firestore Rules

Update Firestore security rules to protect subscription data:

```bash
firebase deploy --only firestore:rules
```

## Step 4: Configure Stripe Webhook

After deploying functions, you need to configure a webhook in Stripe to keep subscription status in sync.

### 4.1 Get the Webhook URL

The webhook URL format is:
```
https://[region]-[project-id].cloudfunctions.net/stripeWebhook
```

Example:
```
https://us-central1-divergent-todos.cloudfunctions.net/stripeWebhook
```

You can find your exact URL by running:
```bash
firebase functions:config:get
```

Or check the Firebase Console → Functions → stripeWebhook.

### 4.2 Create the Webhook in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL from above
4. Click "Select events" and add these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
5. Click "Add endpoint"

### 4.3 Update the Webhook Secret

1. In Stripe, click on your newly created webhook endpoint
2. Click "Reveal" next to "Signing secret"
3. Copy the webhook signing secret (starts with `whsec_`)
4. Update the Firebase secret:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Paste the webhook signing secret
```

5. Redeploy functions to use the new secret:

```bash
firebase deploy --only functions
```

## Step 5: Test the Integration

### 5.1 Test Subscription Creation

In your app, call the subscription functions:

```typescript
import { startSubscription } from './firebase/subscriptions';

// This will redirect to Stripe Checkout
await startSubscription();
```

### 5.2 Use Stripe Test Cards

When testing, use [Stripe test cards](https://stripe.com/docs/testing):

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any 5-digit ZIP code.

### 5.3 Verify Data Sync

After completing a test subscription:

1. Check Firestore:
   - `profiles/{uid}/subscription` should have subscription data
   - `profiles/{uid}/payments/{paymentId}` should have payment records

2. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

3. Check Stripe webhook logs in the Stripe Dashboard

## Step 6: Production Configuration

### 6.1 Update Success/Cancel URLs

The default URLs in the code are:
- Success: `https://divergent-todos.com/billing/success`
- Cancel: `https://divergent-todos.com/billing/cancel`

Update these in the code or pass custom URLs when calling the functions.

### 6.2 Switch to Production Mode

When ready for production:

1. Switch your Stripe account from Test mode to Live mode
2. Get your **Live** API keys from Stripe
3. Create a new **Live** product and get its Price ID
4. Update all Firebase secrets with Live values:
   ```bash
   firebase functions:secrets:set STRIPE_API_KEY
   firebase functions:secrets:set STRIPE_PRICE_ID
   ```
5. Create a new webhook endpoint for Live mode and update the secret
6. Deploy functions again

## Firestore Data Structure

After successful setup, your Firestore will have:

### profiles/{uid}
```typescript
{
  subscription: {
    customerId: string;           // Stripe customer ID
    subscriptionId: string | null; // Stripe subscription ID
    status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | null;
    currentPeriodEnd: Timestamp | null;
    cancelAtPeriodEnd: boolean;
  }
}
```

### profiles/{uid}/payments/{paymentId}
```typescript
{
  amount: number;              // Amount in cents
  currency: string;            // e.g., "usd"
  invoiceId: string;           // Stripe invoice ID
  paymentIntentId: string | null;
  subscriptionId: string | null;
  created: Timestamp;
  periodStart: Timestamp | null;
  periodEnd: Timestamp | null;
  status: string;              // e.g., "paid"
  description: string | null;
}
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check the webhook URL is correct
2. Verify the webhook signing secret is set correctly
3. Check Firebase Functions logs for errors
4. Test the webhook endpoint in Stripe Dashboard

### Subscription Not Syncing to Firestore

1. Check Firebase Functions logs for errors
2. Verify the Firebase UID is being set in Stripe metadata
3. Check Firestore security rules allow the functions to write

### Function Deployment Fails

1. Ensure all secrets are set before deploying
2. Check that billing is enabled on your Firebase project
3. Verify the functions region matches your webhook URL

## Client Usage Examples

```typescript
import {
  startSubscription,
  openBillingPortal,
  stopSubscription,
  resumeSubscription
} from './firebase/subscriptions';

// Start a new subscription
await startSubscription({
  successUrl: window.location.origin + '/success',
  cancelUrl: window.location.origin + '/cancel'
});

// Open billing portal for managing subscription
await openBillingPortal({
  returnUrl: window.location.origin + '/account'
});

// Cancel at period end
await stopSubscription();

// Resume subscription
await resumeSubscription();
```

## Security Notes

1. **Never expose your Stripe Secret Key** - it's stored as a Firebase secret
2. **Subscription data is read-only on client** - only Cloud Functions can modify it
3. **Use Firebase Security Rules** - already configured to protect subscription data
4. **Validate webhook signatures** - the webhook handler verifies signatures automatically
5. **Use HTTPS** - Firebase Functions use HTTPS by default

## Cost Considerations

- Firebase Functions: Pay per invocation and compute time
- Stripe: Standard Stripe fees apply (2.9% + $0.30 per transaction in the US)
- Firestore: Minimal reads/writes for subscription data

## Support

For issues:
- Firebase: [Firebase Support](https://firebase.google.com/support)
- Stripe: [Stripe Support](https://support.stripe.com/)
- Project: Check GitHub issues

# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the Divergent Todos app.

## Functions

### Authentication

#### `authStart`

Initiates the Google OAuth flow for Electron desktop app. Creates a secure session and returns an authorization URL.

#### `authCallback`

Handles the OAuth callback from Google, exchanges the auth code for a Firebase custom token, and redirects to the Electron app.

#### `authExchange`

Exchanges a session ID for a one-time custom token to complete authentication.

### Subscriptions (Stripe)

#### `createSubscription`

Creates a Stripe Checkout session for starting a subscription.

#### `createBillingPortal`

Creates a Stripe billing portal session for managing subscriptions.

#### `stopSubscription`

Marks a subscription to cancel at period end.

#### `resumeSubscription`

Resumes a subscription that was marked for cancellation.

#### `stripeWebhook`

Handles Stripe webhook events for subscription lifecycle management.

### Feedback

#### `submitFeedback`

Sends user feedback via email using Resend.

### Admin Scripts

#### `generateWeekSummary`

**Admin-only**: Generates AI summaries for a user's completed todos in a specific week. Uses OpenAI GPT-4o-mini to create both formal and personal summaries.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit .env with your Google OAuth credentials
   ```

3. Build:

   ```bash
   npm run build
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## Secrets (Firebase Secrets Manager)

The following secrets must be configured using `firebase functions:secrets:set`:

### Authentication

- `GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret from Google Cloud Console

### Stripe

- `STRIPE_API_KEY` - Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PRICE_ID` - Stripe price ID for subscriptions

### Email

- `RESEND_API_KEY` - Resend API key for sending emails

### AI

- `OPENAI_API_KEY` - OpenAI API key for generating summaries

## Development

For local development with Firebase emulators:

```bash
npm run serve
```

## Admin Scripts

### Generate Week Summary

The `generateWeekSummary` function is an admin-only script that generates AI summaries for a user's activity week.

#### Usage from Browser Console

Once deployed, open the Divergent Todos app in your browser and use the global `admin` object:

```javascript
// Generate summary for current year
admin.scripts.generateWeekSummary("userId", 42);

// Generate summary for specific year
admin.scripts.generateWeekSummary("userId", 42, 2025);
```

The script will:

1. Query the activity document for the specified user/week/year
2. Validate that completed todos exist
3. Call OpenAI API to generate two summaries:
   - **Formal Summary**: Abstract, task-focused (for heatmap view)
   - **Personal Summary**: Encouraging, personalized (for motivation)
4. Update the activity document with the generated summaries
5. Log all progress to the browser console

**Requirements**:

- User must be signed in as admin UID
- Target week must have completed todos in Firestore
- `OPENAI_API_KEY` secret must be configured

#### Console Output Example

```
🔧 Admin Script: Generate Week Summary
User ID: abc123
Week: 42
Year: current
Starting...
✅ Success!

Formal Summary:
Completed various feature implementations and bug fixes across the codebase, including authentication improvements and UI enhancements.

Personal Summary:
Great work this week! You tackled a diverse set of tasks and made significant progress on multiple fronts. Keep up the momentum!
```

#### Setting the OpenAI Secret

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Paste your OpenAI API key when prompted
```

#### Viewing Logs

Server-side logs are available in Firebase Console or via CLI:

```bash
firebase functions:log --only generateWeekSummary
```

## Additional Documentation

See [ELECTRON_AUTH_SETUP.md](../ELECTRON_AUTH_SETUP.md) for complete authentication setup instructions.

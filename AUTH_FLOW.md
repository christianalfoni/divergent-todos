# Authentication & Sign-up Flows

This document describes the authentication and sign-up flows for Divergent Todos across different platforms and user types.

## Overview

Divergent Todos uses Firebase Authentication with Google as the primary identity provider. The authentication flow differs between the web app and desktop app to optimize for each platform's user experience and requirements.

## Platform Differences

### Web App
- **Free Tier Available**: Yes (20 todos limit)
- **Anonymous Sign-in**: Supported
- **Account Linking**: Supported
- **Subscription Required**: No (optional for unlimited todos)

### Desktop App (Electron)
- **Free Tier Available**: No
- **Anonymous Sign-in**: Not supported
- **Account Linking**: N/A (users must sign in with Google)
- **Subscription Required**: Yes (mandatory to use the app)

## Web App Authentication Flows

### Flow 1: Anonymous User (Try Before Sign-in)

1. **Initial State**: User opens the web app
2. **AuthModal Appears**: Shows two options:
   - "Sign in with Google" (primary button)
   - "Let me try it first" (secondary button)
3. **User Clicks "Let me try it first"**:
   - Calls `signInAnonymously()` from Firebase
   - User is signed in as anonymous user
   - Gets access to 20 free todos
4. **Using the App**:
   - Can create up to 20 todos
   - All data is stored in Firestore under anonymous UID
   - Theme preferences are synced
5. **Hitting Free Limit**:
   - When user tries to add 21st todo
   - SubscriptionDialog appears with "Sign in required" message
   - Shows "Sign in with Google" button
6. **Account Linking** (if user clicks "Sign in with Google"):
   - Uses `linkWithPopup()` from Firebase Auth
   - Links anonymous account to Google account
   - **All existing todos are preserved**
   - User is now signed in with Google account
   - Free limit still applies unless they subscribe

**Implementation Files**:
- `/apps/web/src/hooks/useSignInAnonymously.ts` - Anonymous sign-in hook
- `/apps/web/src/hooks/useLinkAnonymousAccount.ts` - Account linking hook
- `/apps/web/src/AuthModal.tsx` - Initial auth modal
- `/apps/web/src/SubscriptionDialog.tsx` - Subscription and sign-in prompt

### Flow 2: Direct Google Sign-in (Web)

1. **Initial State**: User opens the web app
2. **AuthModal Appears**: Shows authentication options
3. **User Clicks "Sign in with Google"**:
   - Uses `signInWithPopup()` from Firebase Auth
   - Opens Google sign-in popup
   - User authenticates with Google
   - Returns to app as authenticated user
4. **Using the App**:
   - Can create up to 20 todos (free tier)
   - All data stored under Google account UID
5. **Hitting Free Limit**:
   - SubscriptionDialog appears with subscription offer
   - Shows "Subscribe - $2/month" button
   - User can close the dialog and try again later

**Implementation Files**:
- `/apps/web/src/hooks/useSignIn.ts` - Google sign-in hook
- `/apps/web/src/AuthModal.tsx` - Initial auth modal

## Desktop App (Electron) Authentication Flow

### Flow 3: Desktop App Sign-in (Required + Subscription Required)

1. **Initial State**: User opens the desktop app
2. **AuthModal Appears**: Shows only one option:
   - "Sign in with Google" (no "Let me try it first" option)
3. **User Clicks "Sign in with Google"**:
   - **Electron Native Flow**:
     - Main process generates a `clientNonce`
     - Opens system default browser with Firebase auth URL
     - User authenticates with Google in browser
     - Browser redirects to Firebase Cloud Function
     - Cloud Function validates and exchanges for custom token
     - Returns custom token to Electron via deep link
     - Electron signs in using `signInWithCustomToken()`
4. **Post-Authentication Check**:
   - App checks user's profile for active subscription
   - If no active subscription:
     - SubscriptionDialog appears automatically
     - Shows "Subscription required" message
     - **Dialog cannot be closed** (modal is blocking)
     - Shows "Subscribe - $2/month" button
5. **Subscription Required**:
   - User must subscribe to continue using the app
   - Until subscription is active, the dialog remains open
   - User cannot interact with the main app

**Security Features (Electron)**:
- Context isolation enabled
- Node integration disabled
- Sandbox enabled
- No Firebase Admin SDK in renderer
- Auth flow uses secure token exchange via Cloud Functions

**Implementation Files**:
- `/apps/web/src/hooks/useSignIn.ts` - Handles both web and Electron flows
- `/apps/desktop/src/main/main.ts` - Electron main process with IPC handlers
- `/apps/desktop/src/preload/preload.ts` - Secure IPC bridge
- `/apps/web/src/AuthModal.tsx` - Hides anonymous option in Electron
- `/apps/web/src/App.tsx` - Checks for subscription requirement in Electron
- `/apps/web/src/SubscriptionDialog.tsx` - Enforces subscription in Electron

## Subscription States

The app checks for active subscriptions using the user's profile:

```typescript
const hasActiveSubscription =
  profile?.subscription?.status === "active" ||
  profile?.subscription?.status === "trialing";
```

### Subscription Status Values

- `active` - User has paid and subscription is active
- `trialing` - User is in trial period (treated as active)
- `past_due` - Payment failed but subscription not cancelled yet
- `canceled` - Subscription cancelled by user
- `incomplete` - Initial payment failed
- `incomplete_expired` - Initial payment window expired
- `unpaid` - Multiple payment failures
- `null` - No subscription

### Platform-Specific Subscription Behavior

**Web App**:
- No subscription: 20 todo limit, dialog can be closed
- Active subscription: Unlimited todos

**Desktop App**:
- No subscription: App unusable, dialog blocks all interaction
- Active subscription: Full access to all features

## Account Linking Details

When an anonymous user links their account to Google:

1. **Data Preservation**:
   - All Firestore documents remain accessible
   - Anonymous UID is replaced with Google UID
   - Firebase automatically handles data migration

2. **Technical Implementation**:
   - Web: `linkWithPopup(currentUser, GoogleAuthProvider)`
   - Electron: Sign in with custom token (Firebase handles merge)

3. **Edge Cases**:
   - If linking fails (e.g., Google account already exists), user remains anonymous
   - Error messages are displayed in the SubscriptionDialog
   - User can retry linking

## Firebase Configuration

### Authentication Methods Enabled
- Google (primary provider)
- Anonymous (web only)

### Security Rules
- Firestore rules enforce user can only access their own data
- Cloud Functions validate subscription status server-side
- App Check (optional) can be enabled for production

### Required Firebase Services
- **Authentication**: User sign-in and account management
- **Firestore**: User profile and todo data storage
- **Cloud Functions**: Token exchange for Electron auth

## Environment Detection

The app detects the platform using:

```typescript
const isElectron = window.navigator.userAgent.includes("Electron");
```

This determines:
- Which auth flow to use (popup vs. native browser)
- Whether anonymous sign-in is available
- Whether subscription is required
- Dialog dismissibility

## Future Enhancements

- [ ] Implement actual Stripe subscription flow
- [ ] Add email verification option
- [ ] Support for other OAuth providers (Apple, Microsoft)
- [ ] Offline authentication handling
- [ ] Account deletion flow
- [ ] Export user data functionality

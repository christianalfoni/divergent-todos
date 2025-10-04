# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the Divergent Todos app.

## Functions

### `initiateGoogleAuth`
Initiates the Google OAuth flow for Electron desktop app. When accessed, it redirects to Google's OAuth consent screen.

### `googleAuthCallback`
Handles the OAuth callback from Google, exchanges the auth code for a Firebase custom token, and redirects to the Electron app.

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

## Environment Variables

- `GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret from Google Cloud Console
- `GOOGLE_REDIRECT_URI` - Callback URL (defaults to the Cloud Function URL)

## Development

For local development with Firebase emulators:
```bash
npm run serve
```

See [ELECTRON_AUTH_SETUP.md](../ELECTRON_AUTH_SETUP.md) for complete setup instructions.

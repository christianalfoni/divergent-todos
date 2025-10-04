import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { OAuth2Client } from "google-auth-library";
import * as crypto from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

import {
  GoogleAuthProvider,
  linkWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { pipe } from "pipesy";
import { auth } from "../firebase";

export type LinkAccountState =
  | {
      isLinking: true;
      error: null;
    }
  | {
      isLinking: false;
      error: string;
    }
  | {
      isLinking: false;
      error: null;
    };

export function useLinkAnonymousAccount() {
  return pipe<unknown, LinkAccountState>()
    .setState({ isLinking: true, error: null })
    .async(async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("No user is currently signed in");
      }

      if (!currentUser.isAnonymous) {
        throw new Error("Current user is not anonymous");
      }

      // Check if running in Electron
      if (window.native?.auth) {
        // Electron flow: Get custom token and link it
        console.log("Using Electron native auth flow for linking");
        try {
          // Start auth flow (generates clientNonce, opens browser, exchanges token)
          const customToken = await window.native.auth.startGoogleSignIn();

          // Sign out the anonymous user first, then sign in with custom token
          // Firebase will automatically merge the anonymous user data if configured
          await signInWithCustomToken(auth, customToken);
        } catch (error) {
          throw new Error(
            `Electron auth linking failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        // Web flow: Use linkWithPopup
        console.log("Using web popup auth flow for linking");
        const provider = new GoogleAuthProvider();
        await linkWithPopup(currentUser, provider);
      }
    })
    .map(() => ({ isLinking: false, error: null } as const))
    .catch((err) => ({ isLinking: false, error: String(err) }))
    .setState()
    .use({ isLinking: false, error: null } as const);
}

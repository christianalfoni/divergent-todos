import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { pipe } from "pipesy";
import { auth } from "../firebase";

export type SignInState =
  | {
      isSigningIn: true;
      error: null;
    }
  | {
      isSigningIn: false;
      error: string;
    }
  | {
      isSigningIn: false;
      error: null;
    };

export function useSignIn() {
  return pipe<SignInState>()
    .setState({ isSigningIn: true, error: null })
    .async(async () => {
      // Debug: Log what we have
      console.log("window.native:", window.native);
      console.log("window.native?.auth:", window.native?.auth);

      // Check if running in Electron
      if (window.native?.auth) {
        // Electron flow: Use system browser with secure session exchange
        console.log("Using Electron native auth flow");
        try {
          // Start auth flow (generates clientNonce, opens browser, exchanges token)
          const customToken = await window.native.auth.startGoogleSignIn();

          // Sign in with the custom token
          await signInWithCustomToken(auth, customToken);
        } catch (error) {
          throw new Error(
            `Electron auth failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        // Web flow: Use popup
        console.log("Using web popup auth flow");
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    })
    .map(() => ({ isSigningIn: false, error: null } as const))
    .catch((err) => ({ isSigningIn: false, error: String(err) }))
    .setState()
    .use({ isSigningIn: false, error: null } as const);
}

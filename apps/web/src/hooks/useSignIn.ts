import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { pipe } from "pipesy";
import { auth } from "../firebase";
import { trackSignIn } from "../firebase/analytics";

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
  return pipe<unknown, SignInState>()
    .setState({ isSigningIn: true, error: null })
    .async(async () => {
      // Check if running in Electron
      if (window.native?.auth) {
        try {
          // Start auth flow (generates clientNonce, opens browser, exchanges token)
          const customToken = await window.native.auth.startGoogleSignIn();

          // Sign in with the custom token
          await signInWithCustomToken(auth, customToken);
        } catch (error) {
          throw new Error(
            `Electron auth failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }

      // Track successful sign-in
      trackSignIn("google");

      // We keep signing in as we are waiting for auth to go through
      return { isSigningIn: true, error: null };
    })
    .catch((err) => ({ isSigningIn: false, error: String(err) }))
    .setState()
    .use({ isSigningIn: false, error: null });
}

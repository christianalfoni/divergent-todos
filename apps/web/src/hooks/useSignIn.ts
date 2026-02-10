import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { pipe } from "pipesy";
import { auth, profilesCollection } from "../firebase";
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
  const [signInState, signIn] = pipe<unknown, SignInState>()
    .setState({ isSigningIn: true, error: null })
    .async(async () => {
      let userId: string;

      // Check if running in Electron
      if (window.native?.auth) {
        try {
          // Start auth flow (generates clientNonce, opens browser, exchanges token)
          const customToken = await window.native.auth.startGoogleSignIn();

          // Sign in with the custom token
          const userCredential = await signInWithCustomToken(auth, customToken);
          userId = userCredential.user.uid;
        } catch (error) {
          throw new Error(
            `Electron auth failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        userId = userCredential.user.uid;
      }

      // Track successful sign-in
      trackSignIn("google");

      // Initialize profile document if it doesn't exist
      const profileDoc = doc(profilesCollection, userId);
      await setDoc(profileDoc, { freeTodoCount: 0 }, { merge: true });

      // We keep signing in as we are waiting for auth to go through
      return { isSigningIn: true, error: null };
    })
    // We delay setting the state because we are waiting for auth event
    .delay(5000)
    .map(() => ({ isSigningIn: false, error: null }))
    .catch((err) => ({ isSigningIn: false, error: String(err) }))
    .setState()
    .use({ isSigningIn: false, error: null });

  return [signInState, signIn] as const;
}

import { auth, profilesCollection, type Profile } from "../firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  trackSignIn,
  trackUser,
  trackUserProperties,
} from "../firebase/analytics";
import {
  createCleanup,
  createMutation,
  createState,
  createView,
} from "rask-ui";
import { EnvContext } from "../utils/env";

export type AuthenticationState =
  | {
      isAuthenticating: true;
      user: null;
      profile: null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: null;
      profile: null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: User;
      profile: Profile | null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: null;
      profile: null;
      error: string;
    };

export function createAuthentication() {
  const env = EnvContext.get();
  const signInMutation = createMutation(signIn);
  const state = createState<{ auth: AuthenticationState }>({
    auth: {
      isAuthenticating: true,
      error: null,
      user: null,
      profile: null,
    },
  });
  let unsubscribeProfile: (() => void) | null = null;
  const unsubscribeAuth = onAuthStateChanged(auth, onAuthStateChangedListener);

  createCleanup(() => {
    unsubscribeAuth();
    if (unsubscribeProfile) {
      unsubscribeProfile();
    }
  });

  return createView(state.auth, { signIn: signInMutation });

  async function signIn() {
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

    state.auth = {
      error: null,
      isAuthenticating: true,
      profile: null,
      user: null,
    };
  }

  function onAuthStateChangedListener(user: User | null) {
    // Clean up any existing profile listener
    if (unsubscribeProfile) {
      unsubscribeProfile();
      unsubscribeProfile = null;
    }

    if (!user) {
      // User logged out - clear everything
      trackUser(null);
      state.auth = {
        isAuthenticating: false,
        user: null,
        profile: null,
        error: null,
      };
      return;
    }

    // Track user authentication
    trackUser(user.uid);
    trackUserProperties({
      authMethod: user.isAnonymous ? "anonymous" : "google",
      isElectron: env.isElectron ? "true" : "false",
    });

    // Set up profile listener
    const profileDoc = doc(profilesCollection, user.uid);
    unsubscribeProfile = onSnapshot(
      profileDoc,
      { includeMetadataChanges: true },
      (snapshot) => {
        const profile = snapshot.exists()
          ? snapshot.data({ serverTimestamps: "estimate" })
          : null;

        // Update authentication state with profile - now fully authenticated
        state.auth = {
          isAuthenticating: false,
          user,
          profile,
          error: null,
        };
      },
      (error) => {
        console.error("[useAuthentication] Profile snapshot error:", error);
      }
    );
  }
}

import { pipe } from "pipesy";
import { auth, profilesCollection, type Profile } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";

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

export function useAuthentication() {
  const [authentication, setAuthentication] = pipe<
    AuthenticationState,
    AuthenticationState
  >()
    .setState()
    .useCache("authentication", {
      isAuthenticating: true,
      error: null,
      user: null,
      profile: null,
    });

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any existing profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!user) {
        // User logged out - clear everything
        setAuthentication({
          isAuthenticating: false,
          user: null,
          profile: null,
          error: null,
        });
        return;
      }

      // User logged in - set user and start listening to profile
      // Initially set profile to null until we load it
      setAuthentication({
        isAuthenticating: false,
        user,
        profile: null,
        error: null,
      });

      // Set up profile listener
      const profileDoc = doc(profilesCollection, user.uid);
      unsubscribeProfile = onSnapshot(
        profileDoc,
        { includeMetadataChanges: false },
        (snapshot) => {
          const profile = snapshot.exists()
            ? snapshot.data({ serverTimestamps: "estimate" })
            : null;

          // Update authentication state with new profile
          setAuthentication({
            isAuthenticating: false,
            user,
            profile,
            error: null,
          });
        }
      );
    });

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [setAuthentication]);

  return authentication;
}

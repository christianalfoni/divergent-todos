import { useState, useEffect } from "react";
import { auth, profilesCollection, type Profile } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { trackUser, trackUserProperties } from "../firebase/analytics";

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
  const [authentication, setAuthentication] = useState<AuthenticationState>({
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
        trackUser(null);
        setAuthentication({
          isAuthenticating: false,
          user: null,
          profile: null,
          error: null,
        });
        return;
      }

      // Track user authentication
      trackUser(user.uid);
      trackUserProperties({
        authMethod: user.isAnonymous ? "anonymous" : "google",
        isElectron: window.navigator.userAgent.includes("Electron") ? "true" : "false",
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
          setAuthentication({
            isAuthenticating: false,
            user,
            profile,
            error: null,
          });
        },
        (error) => {
          console.error('[useAuthentication] Profile snapshot error:', error);
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
  }, []);

  return [authentication, setAuthentication] as const;
}

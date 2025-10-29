import { pipe } from "pipesy";
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
  const [authentication, setAuthentication] = pipe<
    (state: AuthenticationState) => AuthenticationState,
    AuthenticationState
  >()
    .updateState((state, cb) => cb(state))
    .use(
      {
        isAuthenticating: true,
        error: null,
        user: null,
        profile: null,
      },
      "authentication",
      () => {
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
            setAuthentication(() => ({
              isAuthenticating: false,
              user: null,
              profile: null,
              error: null,
            }));
            return;
          }

          // Track user authentication
          trackUser(user.uid);
          trackUserProperties({
            authMethod: user.isAnonymous ? "anonymous" : "google",
            isElectron: window.navigator.userAgent.includes("Electron") ? "true" : "false",
          });

          // Debug: Log user data to check photoURL
          console.log("User authenticated:", {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAnonymous: user.isAnonymous,
            providerId: user.providerId,
            providerData: user.providerData,
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
              setAuthentication(() => ({
                isAuthenticating: false,
                user,
                profile,
                error: null,
              }));
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
      },
      []
    );

  return [authentication, setAuthentication] as const;
}

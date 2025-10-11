import { signInAnonymously } from "firebase/auth";
import { pipe } from "pipesy";
import { auth } from "../firebase";
import { trackSignIn } from "../firebase/analytics";

export type SignInAnonymouslyState =
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

export function useSignInAnonymously() {
  const [signInState, setSignInState] = pipe<unknown, SignInAnonymouslyState>()
    .setState({ isSigningIn: true, error: null })
    .async(async () => {
      await signInAnonymously(auth);

      // Track anonymous sign-in
      trackSignIn("anonymous");

      // We keep signing in as we are waiting for auth to go through
      return { isSigningIn: true, error: null };
    })
    // We delay setting the state because we are waiting for auth event
    .delay(5000)
    .map(() => ({ isSigningIn: false, error: null }))
    .catch((err) => ({ isSigningIn: false, error: String(err) }))
    .setState()
    .use({ isSigningIn: false, error: null });

  return [signInState, setSignInState] as const;
}

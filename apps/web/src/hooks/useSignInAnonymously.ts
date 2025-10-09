import { signInAnonymously } from "firebase/auth";
import { pipe } from "pipesy";
import { auth } from "../firebase";

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
  return pipe<unknown, SignInAnonymouslyState>()
    .setState({ isSigningIn: true, error: null })
    .async(async () => {
      await signInAnonymously(auth);
    })
    .catch((err) => ({ isSigningIn: false, error: String(err) }))
    .setState()
    .use({ isSigningIn: false, error: null } as const);
}

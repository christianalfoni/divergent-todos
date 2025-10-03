import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    })
    .map(() => ({ isSigningIn: false, error: null }))
    .catch((err) => ({ isSigningIn: false, error: String(err) }))
    .setState()
    .use({ isSigningIn: false, error: null });
}

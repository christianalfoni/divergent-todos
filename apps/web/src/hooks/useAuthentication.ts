import { pipe } from "pipesy";
import { auth } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

export type AuthenticationState =
  | {
      isAuthenticating: true;
      user: null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: null;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: User;
      error: null;
    }
  | {
      isAuthenticating: false;
      user: null;
      error: string;
    };

export function useAuthentication() {
  return pipe<AuthenticationState, AuthenticationState>()
    .setState()
    .useCache(
      "authentication",
      {
        isAuthenticating: true,
        error: null,
        user: null,
      },
      (emit) =>
        onAuthStateChanged(auth, (user) => {
          emit(
            user
              ? { isAuthenticating: false, user, error: null }
              : { isAuthenticating: false, user: null, error: null }
          );
        })
    );
}

import { pipe } from "pipesy";
import { auth } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect } from "react";

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
  const [authentication, setAuthentication] = pipe<
    AuthenticationState,
    AuthenticationState
  >()
    .setState()
    .useCache("authentication", {
      isAuthenticating: true,
      error: null,
      user: null,
    });

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setAuthentication(
          user
            ? { isAuthenticating: false, user, error: null }
            : { isAuthenticating: false, user: null, error: null }
        );
      }),
    [setAuthentication]
  );

  return authentication;
}

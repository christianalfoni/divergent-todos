import { useState, useEffect } from "react";
import { auth } from "../firebase";

export function useIsTestUser(): boolean {
  const [isTestUser, setIsTestUser] = useState(false);

  useEffect(() => {
    const checkTestUser = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult();
          setIsTestUser(idTokenResult.claims.isTestUser === true);
        } catch (error) {
          console.error("Failed to check test user status:", error);
          setIsTestUser(false);
        }
      } else {
        setIsTestUser(false);
      }
    };

    checkTestUser();

    // Re-check when auth state changes
    const unsubscribe = auth.onAuthStateChanged(checkTestUser);

    return unsubscribe;
  }, []);

  return isTestUser;
}

import { useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase";

interface UseTestSigninResult {
  signInAsTestUser: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useTestSignin(): UseTestSigninResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInAsTestUser = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call cloud function to create test user
      const createTestUser = httpsCallable(functions, "createTestUser");
      const result = await createTestUser({
        devSecret: import.meta.env.VITE_DEV_MODE_SECRET,
      });

      const { customToken } = result.data as {
        customToken: string;
        uid: string;
        email: string;
      };

      // Sign in with custom token - triggers onAuthStateChanged!
      await signInWithCustomToken(auth, customToken);
    } catch (err) {
      console.error("Failed to sign in as test user:", err);
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return { signInAsTestUser, loading, error };
}

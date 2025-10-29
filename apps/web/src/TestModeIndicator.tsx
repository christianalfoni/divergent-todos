import { useEffect, useState } from "react";
import { useAuthentication } from "./hooks/useAuthentication";

export default function TestModeIndicator() {
  const [authentication] = useAuthentication();
  const [isTestUser, setIsTestUser] = useState(false);

  useEffect(() => {
    const checkTestUser = async () => {
      if (!authentication.user) {
        setIsTestUser(false);
        return;
      }

      try {
        // Check custom claims from the auth token
        const idTokenResult = await authentication.user.getIdTokenResult();
        setIsTestUser(idTokenResult.claims.isTestUser === true);
      } catch (error) {
        console.error("Failed to check test user status:", error);
        setIsTestUser(false);
      }
    };

    checkTestUser();
  }, [authentication.user]);

  if (!isTestUser) {
    return null;
  }

  return (
    <div className="bg-yellow-400 text-black text-xs text-center py-1 px-2 font-semibold">
      🧪 Test User Mode - This account will be deleted on sign out
    </div>
  );
}

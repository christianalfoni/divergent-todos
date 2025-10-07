import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { profilesCollection } from "../firebase";
import { useAuthentication } from "./useAuthentication";

/**
 * Hook that marks the desktop app as installed when running in Electron
 * and the user is authenticated. This only updates if hasInstalledApp is
 * undefined or false.
 */
export function useMarkAppInstalled() {
  const [authentication] = useAuthentication();

  useEffect(() => {
    // Check if running in Electron
    const isElectron = window.navigator.userAgent.includes("Electron");

    // Only proceed if in Electron, user is authenticated, and profile exists
    if (!isElectron || !authentication.user || !authentication.profile) {
      return;
    }

    // Check if we need to update (only if undefined or false)
    if (authentication.profile.hasInstalledApp !== true) {
      const profileDoc = doc(profilesCollection, authentication.user.uid);

      // Update the field
      updateDoc(profileDoc, {
        hasInstalledApp: true,
      }).catch((error) => {
        console.error("Failed to mark app as installed:", error);
      });
    }
  }, [authentication.user, authentication.profile]);
}

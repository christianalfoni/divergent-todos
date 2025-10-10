import { useEffect, useState } from "react";
import { useAuthentication } from "./useAuthentication";
import { useEditProfile } from "./useEditProfile";
import { trackViewModeChanged } from "../firebase/analytics";

export type ViewMode = "one-week" | "two-weeks";

const STORAGE_KEY = "app-view-mode";

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return "one-week";
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "one-week" || stored === "two-weeks") {
      return stored;
    }
  } catch (error) {
    console.error("Failed to parse stored viewMode:", error);
  }

  return "one-week";
}

export function useViewMode() {
  const [authentication] = useAuthentication();
  const profile = authentication.profile;
  const [, editProfile] = useEditProfile();
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);

  // Sync profile viewMode to local state and localStorage (profile is source of truth)
  useEffect(() => {
    if (profile?.viewMode) {
      setViewMode(profile.viewMode);

      // Update localStorage to match profile
      localStorage.setItem(STORAGE_KEY, profile.viewMode);
    }
  }, [profile?.viewMode]);

  // Apply viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const setViewModeAndSync = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);
    // Update profile with new viewMode (profile is source of truth)
    editProfile({ viewMode: newViewMode });

    // Track view mode change
    trackViewModeChanged(newViewMode);
  };

  return {
    viewMode,
    setViewMode: setViewModeAndSync,
  };
}

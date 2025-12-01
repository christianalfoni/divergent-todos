import { useEffect, useState } from "react";
import { useAuthentication } from "../contexts/AuthenticationContext";
import { useEditProfile } from "./useEditProfile";
import { trackFontSizeChanged } from "../firebase/analytics";

export type FontSize = "small" | "medium" | "large";

const STORAGE_KEY = "app-font-size";

function getStoredFontSize(): FontSize {
  if (typeof window === "undefined") {
    return "medium";
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (
      stored &&
      (stored === "small" || stored === "medium" || stored === "large")
    ) {
      return stored as FontSize;
    }
  } catch (error) {
    console.error("Failed to parse stored font size:", error);
  }

  return "medium";
}

function applyFontSize(fontSize: FontSize) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-font-size", fontSize);
}

export function useFontSize() {
  const [authentication] = useAuthentication();
  const profile = authentication.profile;
  const [, editProfile] = useEditProfile();
  const [fontSize, setFontSizeState] = useState<FontSize>(getStoredFontSize);

  // Sync profile font size to local state and localStorage (profile is source of truth)
  useEffect(() => {
    if (profile?.fontSize) {
      const newFontSize = profile.fontSize as FontSize;
      setFontSizeState(newFontSize);

      // Update localStorage to match profile
      localStorage.setItem(STORAGE_KEY, newFontSize);
    }
  }, [profile?.fontSize]);

  // Apply font size whenever it changes
  useEffect(() => {
    applyFontSize(fontSize);
    localStorage.setItem(STORAGE_KEY, fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    // Update profile with new font size (profile is source of truth)
    editProfile({ fontSize: size });
    // Track font size change
    trackFontSizeChanged(size);
  };

  return {
    fontSize,
    setFontSize,
  };
}

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Theme = "default" | "ocean" | "forest" | "sunset";

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  effectiveMode: "light" | "dark"; // The actual mode being displayed
}

const STORAGE_KEY = "app-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): ThemeState {
  if (typeof window === "undefined") {
    return { mode: "system", theme: "default", effectiveMode: "dark" };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const effectiveMode =
        parsed.mode === "system" ? getSystemTheme() : parsed.mode;
      return { ...parsed, effectiveMode };
    }
  } catch (error) {
    console.error("Failed to parse stored theme:", error);
  }

  return {
    mode: "system",
    theme: "default",
    effectiveMode: getSystemTheme(),
  };
}

function applyTheme(state: ThemeState) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  // Apply dark/light class
  if (state.effectiveMode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Apply theme data attribute (for future custom themes)
  root.setAttribute("data-theme", state.theme);
}

export function useTheme() {
  const [themeState, setThemeState] = useState<ThemeState>(getStoredTheme);

  // Listen to system theme changes
  useEffect(() => {
    if (themeState.mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const newEffectiveMode = e.matches ? "dark" : "light";
      setThemeState((prev) => ({
        ...prev,
        effectiveMode: newEffectiveMode,
      }));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeState.mode]);

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(themeState);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: themeState.mode,
        theme: themeState.theme,
      })
    );
  }, [themeState]);

  const setMode = (mode: ThemeMode) => {
    setThemeState((prev) => ({
      ...prev,
      mode,
      effectiveMode: mode === "system" ? getSystemTheme() : mode,
    }));
  };

  const setTheme = (theme: Theme) => {
    setThemeState((prev) => ({ ...prev, theme }));
  };

  return {
    mode: themeState.mode,
    theme: themeState.theme,
    effectiveMode: themeState.effectiveMode,
    setMode,
    setTheme,
  };
}

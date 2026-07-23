import { useCallback, useEffect, useState } from "react";
import { applyTheme, DEFAULT_THEME_ID, THEMES } from "../themes";

export type ColorMode = "light" | "dark";

const MODE_STORAGE_KEY = "theme";
const THEME_STORAGE_KEY = "app-theme";

function getInitialMode(): ColorMode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialThemeId(): string {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored && THEMES.some((theme) => theme.id === stored)
    ? stored
    : DEFAULT_THEME_ID;
}

export function useTheme() {
  const [mode, setMode] = useState<ColorMode>(getInitialMode);
  const [themeId] = useState(getInitialThemeId);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    applyTheme(themeId, mode);
  }, [mode, themeId]);

  const toggle = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { mode, toggle };
}

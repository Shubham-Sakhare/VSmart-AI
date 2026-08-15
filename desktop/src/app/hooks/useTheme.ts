import { useCallback, useEffect, useState } from "react";

export type ThemeId = "neon" | "aurora" | "sunset" | "emerald" | "violet-ink";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  swatch: [string, string, string];
}

export const THEMES: ThemeDef[] = [
  { id: "neon", label: "Neon Cyan", swatch: ["#00e5ff", "#a855f7", "#ff2e9a"] },
  { id: "aurora", label: "Aurora", swatch: ["#6ea8ff", "#b06cff", "#ff8fd6"] },
  { id: "sunset", label: "Sunset", swatch: ["#ff9d3d", "#ff5f7e", "#ffd166"] },
  { id: "emerald", label: "Emerald", swatch: ["#2dd4bf", "#34d399", "#a3ffcf"] },
  { id: "violet-ink", label: "Violet Ink", swatch: ["#8b5cf6", "#ec4899", "#60a5fa"] }
];

const THEME_KEY = "vsmart_theme";
const DEFAULT_THEME: ThemeId = "neon";

function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}

/** Applies the theme to <html data-theme="..."> immediately (sync, no flash). */
export function applyThemeToDom(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Apply whatever was saved locally as early as possible (before React paints),
// then reconcile with the async persisted store once it resolves.
try {
  const cached = localStorage.getItem(THEME_KEY);
  applyThemeToDom(isThemeId(cached) ? cached : DEFAULT_THEME);
} catch {
  applyThemeToDom(DEFAULT_THEME);
}

/**
 * Reads/writes the active theme. Persists to window.vsmart's memory store
 * when available (synced across the app's own settings), and falls back to
 * localStorage-only when running outside Electron (e.g. plain browser dev).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const cached = localStorage.getItem(THEME_KEY);
      return isThemeId(cached) ? cached : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    let cancelled = false;
    window.vsmart?.getMemory?.(THEME_KEY)
      .then((raw) => {
        if (!cancelled && isThemeId(raw) && raw !== theme) {
          setThemeState(raw);
          applyThemeToDom(raw);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    applyThemeToDom(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    window.vsmart?.saveMemory?.(THEME_KEY, next).catch(() => {});
  }, []);

  return { theme, setTheme, themes: THEMES };
}
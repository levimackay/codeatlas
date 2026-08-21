import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { KIND_COLORS_DARK, KIND_COLORS_LIGHT } from "../lib/kind-colors";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "codeatlas.theme";

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to default.
  }
  // CodeAtlas ships open in dark mode by default (DESIGN.md 3.1), it does
  // not infer from prefers-color-scheme on first run.
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const colors = theme === "dark" ? KIND_COLORS_DARK : KIND_COLORS_LIGHT;
    for (const [kind, hex] of Object.entries(colors)) {
      document.documentElement.style.setProperty(`--kind-${kind}`, hex);
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Non-fatal: theme just won't persist across relaunches.
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

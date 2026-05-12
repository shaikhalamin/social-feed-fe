import { create } from "zustand"
import {
  
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme
} from "@/lib/theme"
import type {Theme} from "@/lib/theme";

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // best-effort; private mode / quota — swallow.
  }
}

const initialTheme: Theme =
  typeof window === "undefined" ? "light" : readStoredTheme()

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme)
    persistTheme(theme)
    set({ theme })
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark"
    applyTheme(next)
    persistTheme(next)
    set({ theme: next })
  },
}))

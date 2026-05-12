export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "theme"

export function readStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return value === "dark" ? "dark" : "light"
  } catch {
    return "light"
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

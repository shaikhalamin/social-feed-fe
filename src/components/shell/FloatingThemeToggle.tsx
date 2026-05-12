import { MoonIcon, SunIcon } from "@/components/shell/icons"
import { useThemeStore } from "@/hooks/use-theme"

export function FloatingThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      className="fixed left-4 top-1/2 z-50 -translate-y-1/2 inline-flex h-8 w-14 items-center rounded-full bg-foreground/90 px-1 text-background shadow-lg"
    >
      <span
        className={`absolute flex size-6 items-center justify-center rounded-full bg-background text-foreground transition-transform ${isDark ? "translate-x-6" : "translate-x-0"}`}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="ml-auto flex size-6 items-center justify-center opacity-60">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  )
}

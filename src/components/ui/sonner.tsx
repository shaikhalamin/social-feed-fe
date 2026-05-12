import { Toaster as SonnerToaster, toast } from "sonner"
import { useThemeStore } from "@/hooks/use-theme"

export function Toaster() {
  const theme = useThemeStore((s) => s.theme)
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      theme={theme}
    />
  )
}

export { toast }

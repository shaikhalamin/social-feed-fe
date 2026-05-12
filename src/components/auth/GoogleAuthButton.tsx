import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function GoogleAuthButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-3"
      onClick={() => toast.info("Google sign-in coming soon")}
    >
      <img src="/auth/google.svg" alt="" className="size-5" />
      <span>{label}</span>
    </Button>
  )
}

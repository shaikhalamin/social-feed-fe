import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

type Props = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  className?: string
}

export function AuthRadioCheck({ className, ...props }: Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="auth-radio-check"
      className={cn(
        "peer size-4 shrink-0 rounded-full border border-input bg-card outline-none transition-colors",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        "data-[state=checked]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="auth-radio-check-indicator"
        className="grid place-content-center"
      >
        <span className="block size-2 rounded-full bg-primary" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

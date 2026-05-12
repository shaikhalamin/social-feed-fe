import * as React from "react"
import { Slot } from "radix-ui"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { AnyFieldApi } from "@tanstack/react-form"

type FormFieldContextValue = {
  fieldId: string
  field: AnyFieldApi
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

function useFormField() {
  const ctx = React.useContext(FormFieldContext)
  if (!ctx) {
    throw new Error("FormItem children must be used inside <FormField>")
  }
  const error = ctx.field.state.meta.errors[0]
  return {
    id: ctx.fieldId,
    name: ctx.field.name,
    formItemId: `${ctx.fieldId}-form-item`,
    formDescriptionId: `${ctx.fieldId}-form-description`,
    formMessageId: `${ctx.fieldId}-form-message`,
    error,
    field: ctx.field,
  }
}

type FormFieldProps = {
  field: AnyFieldApi
  children: React.ReactNode
}

export function FormField({ field, children }: FormFieldProps) {
  const fieldId = React.useId()
  return (
    <FormFieldContext.Provider value={{ fieldId, field }}>
      {children}
    </FormFieldContext.Provider>
  )
}

export const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
FormItem.displayName = "FormItem"

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()
  return (
    <Label
      ref={ref}
      htmlFor={formItemId}
      className={cn(error && "text-destructive", className)}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

export const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot.Root>,
  React.ComponentPropsWithoutRef<typeof Slot.Root>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <Slot.Root
      ref={ref}
      id={formItemId}
      aria-describedby={
        error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const messageText = error
    ? typeof error === "string"
      ? error
      : (error as { message?: string }).message ?? String(error)
    : children
  if (!messageText) return null
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {messageText}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

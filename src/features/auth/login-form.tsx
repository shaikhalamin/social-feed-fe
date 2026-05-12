import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { loginBodySchema } from "@/gen/api/zod/loginBodySchema.ts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthRadioCheck } from "@/components/auth/AuthRadioCheck"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { useLoginMutation } from "./use-login"
import { extractApiError } from "./extract-error"

type Props = {
  redirectParam?: string
}

export function LoginForm({ redirectParam }: Props) {
  const mutation = useLoginMutation(redirectParam)
  const [topError, setTopError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: "", password: "", rememberMe: true },
    validators: {
      onSubmit: ({ value }) => {
        const result = loginBodySchema.safeParse({
          email: value.email,
          password: value.password,
        })
        if (!result.success) {
          const fieldErrors: Record<string, string> = {}
          for (const issue of result.error.issues) {
            const key = issue.path[0]
            if (typeof key === "string" && !(key in fieldErrors)) {
              fieldErrors[key] = issue.message
            }
          }
          return { fields: fieldErrors }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setTopError(null)
      try {
        await mutation.mutateAsync({
          data: { email: value.email, password: value.password },
        })
      } catch (err) {
        const { status, message } = extractApiError(err)
        if (status === 401) {
          setTopError("Invalid email or password")
          toast.error(message)
          form.setFieldValue("password", "")
        } else {
          toast.error(message)
        }
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (mutation.isPending) return
        void form.handleSubmit()
      }}
      className="space-y-4 text-center [&_label]:justify-center sm:text-left sm:[&_label]:justify-start"
    >
      {topError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {topError}
        </div>
      ) : null}

      <form.Field name="email">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <form.Field name="rememberMe">
          {(field) => (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <AuthRadioCheck
                checked={field.state.value}
                onCheckedChange={(v) =>
                  field.handleChange(v === "indeterminate" ? false : v)
                }
              />
              Remember me
            </label>
          )}
        </form.Field>
        <button
          type="button"
          onClick={() => toast.info("Password reset coming soon")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Login now"
        )}
      </Button>
    </form>
  )
}

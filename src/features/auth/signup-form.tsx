import { useForm } from "@tanstack/react-form"
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { z } from "zod/v4"
import { signupBodySchema } from "@/gen/api/zod/signupBodySchema.ts"
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
import { useSignupMutation } from "./use-signup"
import { extractApiError } from "./extract-error"

const fullSchema = signupBodySchema
  .extend({
    confirmPassword: z.string(),
    agreeToTerms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.agreeToTerms === true, {
    message: "You must agree to the terms",
    path: ["agreeToTerms"],
  })

export function SignupForm() {
  const mutation = useSignupMutation()

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false as boolean,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = fullSchema.safeParse(value)
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
      try {
        await mutation.mutateAsync({
          data: {
            firstName: value.firstName,
            lastName: value.lastName,
            email: value.email,
            password: value.password,
          },
        })
      } catch (err) {
        const { status, message } = extractApiError(err)
        if (status === 409) {
          form.setFieldMeta("email", (m) => ({
            ...m,
            errors: ["Email already in use"],
          }))
          toast.error(message)
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
      <form.Field name="firstName">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="given-name"
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

      <form.Field name="lastName">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="family-name"
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
                  autoComplete="new-password"
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

      <form.Field name="confirmPassword">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Repeat password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
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

      <form.Field name="agreeToTerms">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <AuthRadioCheck
                  checked={field.state.value}
                  onCheckedChange={(v) =>
                    field.handleChange(v === "indeterminate" ? false : v)
                  }
                />
                I agree to terms &amp; conditions
              </label>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

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
          "Sign up now"
        )}
      </Button>
    </form>
  )
}

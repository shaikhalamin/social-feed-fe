import { createFileRoute } from "@tanstack/react-router"
import { AuthHero } from "@/components/auth/AuthHero"
import { AuthCard } from "@/components/auth/AuthCard"
import { BottomLink } from "@/components/auth/BottomLink"
import { LoginForm } from "@/features/auth/login-form"

type LoginSearch = { redirect?: string }

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search): LoginSearch => ({
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectParam } = Route.useSearch()
  return (
    <>
      <AuthHero imageSrc="/auth/login.png" imageAlt="Sign in illustration" />
      <AuthCard
        eyebrow="Welcome back"
        title="Login to your account"
        footer={
          <BottomLink
            prompt="Don't have an account?"
            linkText="Create New Account"
            to="/auth/signup"
          />
        }
      >
        <LoginForm redirectParam={redirectParam} />
      </AuthCard>
    </>
  )
}

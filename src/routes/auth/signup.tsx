import { createFileRoute } from "@tanstack/react-router"
import { AuthHero } from "@/components/auth/AuthHero"
import { AuthCard } from "@/components/auth/AuthCard"
import { BottomLink } from "@/components/auth/BottomLink"
import { SignupForm } from "@/features/auth/signup-form"

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
})

function SignupPage() {
  return (
    <>
      <AuthHero
        imageSrc="/auth/registration.png"
        imageAlt="Registration illustration"
      />
      <AuthCard
        eyebrow="Get Started Now"
        title="Registration"
        footer={
          <BottomLink
            prompt="Already have an account?"
            linkText="Sign in"
            to="/auth/login"
          />
        }
      >
        <SignupForm />
      </AuthCard>
    </>
  )
}

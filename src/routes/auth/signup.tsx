import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Sign up</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Signup form — coming in next phase.
      </p>
    </div>
  )
}

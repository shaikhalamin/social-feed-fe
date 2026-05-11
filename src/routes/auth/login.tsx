import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Login form — coming in next phase.
      </p>
    </div>
  )
}

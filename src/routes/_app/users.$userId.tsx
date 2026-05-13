import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/users/$userId')({
  component: UserProfileRouteStub,
})

function UserProfileRouteStub() {
  return null
}

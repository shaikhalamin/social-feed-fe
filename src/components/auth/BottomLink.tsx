import { Link } from "@tanstack/react-router"

type Props = {
  prompt: string
  linkText: string
  to: "/auth/login" | "/auth/signup"
}

export function BottomLink({ prompt, linkText, to }: Props) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link to={to} className="font-medium text-primary hover:underline">
        {linkText}
      </Link>
    </p>
  )
}

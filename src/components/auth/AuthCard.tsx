import type { ReactNode } from "react"
import { AuthDivider } from "./AuthDivider"
import { GoogleAuthButton } from "./GoogleAuthButton"

type Props = {
  eyebrow: string
  title: string
  googleLabel: string
  children: ReactNode
  footer: ReactNode
}

export function AuthCard({ eyebrow, title, googleLabel, children, footer }: Props) {
  return (
    <div className="col-span-1 lg:col-span-4 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <img src="/logo.svg" alt="Buddy Script" className="mb-8 h-10 w-auto" />
        <p className="mb-2 text-sm text-muted-foreground">{eyebrow}</p>
        <h1 className="mb-10 text-2xl font-semibold text-foreground">{title}</h1>
        <GoogleAuthButton label={googleLabel} />
        <AuthDivider />
        {children}
        <div className="mt-10">{footer}</div>
      </div>
    </div>
  )
}

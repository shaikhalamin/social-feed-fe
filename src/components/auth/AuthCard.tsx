import type { ReactNode } from "react"
import { AuthDivider } from "./AuthDivider"
import { GoogleAuthButton } from "./GoogleAuthButton"

type Props = {
  eyebrow: string
  title: string
  googleLabel?: string
  children: ReactNode
  footer: ReactNode
}

export function AuthCard({ eyebrow, title, googleLabel, children, footer }: Props) {
  return (
    <div className="col-span-1 flex justify-center lg:col-span-4 lg:col-start-9">
      <div className="w-full max-w-[420px] rounded-md bg-card p-6 shadow-[0_2px_24px_rgba(15,23,42,0.06)] sm:p-12">
        <img src="/logo.svg" alt="Buddy Script" className="mx-auto mb-7 h-auto w-[161px]" />
        <p className="mb-2 text-center text-sm text-muted-foreground">{eyebrow}</p>
        <h1 className="mb-10 text-center text-[28px] font-semibold leading-tight text-foreground sm:mb-12">
          {title}
        </h1>
        {googleLabel ? (
          <>
            <GoogleAuthButton label={googleLabel} />
            <AuthDivider />
          </>
        ) : null}
        {children}
        <div className="mt-10 text-center">{footer}</div>
      </div>
    </div>
  )
}

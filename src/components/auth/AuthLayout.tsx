import type { ReactNode } from "react"
import { AuthShapeBackdrop } from "./AuthShapeBackdrop"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <AuthShapeBackdrop />
      <div className="relative z-0 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-12">
        {children}
      </div>
    </div>
  )
}

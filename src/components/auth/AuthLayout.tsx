import type { ReactNode } from "react"
import { AuthShapeBackdrop } from "./AuthShapeBackdrop"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background py-12 lg:py-[100px]">
      <AuthShapeBackdrop />
      <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-12">
        {children}
      </div>
    </div>
  )
}

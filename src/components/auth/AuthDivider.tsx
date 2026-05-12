export function AuthDivider() {
  return (
    <div className="relative my-10 text-center">
      <span className="absolute left-0 top-1/2 h-px w-[108px] -translate-y-1/2 bg-border" />
      <span className="absolute right-0 top-1/2 h-px w-[108px] -translate-y-1/2 bg-border" />
      <span className="text-sm text-muted-foreground">Or</span>
    </div>
  )
}

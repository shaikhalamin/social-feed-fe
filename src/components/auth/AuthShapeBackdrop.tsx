export function AuthShapeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <img
        src="/auth/shape1.svg"
        alt=""
        className="absolute -top-10 -left-10 w-48 md:w-64"
      />
      <img
        src="/auth/shape2.svg"
        alt=""
        className="absolute bottom-0 right-0 w-56 md:w-72"
      />
      <img
        src="/auth/shape3.svg"
        alt=""
        className="absolute top-1/3 right-1/4 w-32 md:w-40 opacity-80"
      />
    </div>
  )
}

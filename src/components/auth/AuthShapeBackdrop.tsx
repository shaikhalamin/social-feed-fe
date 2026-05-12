export function AuthShapeBackdrop() {
  return (
    <>
      <img
        src="/auth/shape1.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 hidden h-[540px] w-[176px] select-none lg:block"
      />
      <img
        src="/auth/shape2.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-0 right-[20px] hidden h-[400px] w-[568px] select-none lg:block"
      />
      <img
        src="/auth/shape3.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-[327px] hidden h-[548px] w-[568px] select-none lg:block"
      />
    </>
  )
}

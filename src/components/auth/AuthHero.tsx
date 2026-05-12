type Props = {
  imageSrc: string
  imageAlt: string
}

export function AuthHero({ imageSrc, imageAlt }: Props) {
  return (
    <div className="col-span-1 flex items-center justify-center px-4 lg:col-span-7 lg:col-start-1 lg:px-12">
      <img src={imageSrc} alt={imageAlt} className="h-auto w-full max-w-[420px] lg:max-w-[640px]" />
    </div>
  )
}

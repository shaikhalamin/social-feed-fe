type Props = {
  imageSrc: string
  imageAlt: string
}

export function AuthHero({ imageSrc, imageAlt }: Props) {
  return (
    <div className="hidden lg:col-span-8 lg:flex items-center justify-center px-12">
      <img src={imageSrc} alt={imageAlt} className="max-h-[80vh] w-auto" />
    </div>
  )
}

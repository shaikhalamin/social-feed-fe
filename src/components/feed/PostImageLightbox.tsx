import { useCallback, useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PostImage } from '@/gen/api/types/PostImage.ts'

type Props = {
  images: PostImage[]
  initialIndex: number
  open: boolean
  onOpenChange: (next: boolean) => void
}

export function PostImageLightbox({
  images,
  initialIndex,
  open,
  onOpenChange,
}: Props) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
  }, [images.length])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    }
  }

  if (images.length === 0) return null
  const current = images[Math.min(index, images.length - 1)]
  const multi = images.length > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={onKeyDown}
        className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-[95vw]"
      >
        <DialogTitle className="sr-only">Image viewer</DialogTitle>
        <div className="relative flex items-center justify-center">
          <img
            src={current.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          {multi ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

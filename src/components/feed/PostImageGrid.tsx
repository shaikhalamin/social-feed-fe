import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PostImage } from '@/gen/api/types/PostImage.ts'
import { PostImageLightbox } from './PostImageLightbox'

type Props = { images: PostImage[] }

function sortByPosition(images: PostImage[]): PostImage[] {
  return images.slice().sort((a, b) => a.position - b.position)
}

export function PostImageGrid({ images }: Props) {
  const ordered = useMemo(() => sortByPosition(images), [images])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  if (ordered.length === 0) return null

  const openAt = (i: number) => {
    setActiveIndex(i)
    setOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-1 overflow-hidden rounded-md',
          ordered.length === 1 && 'grid-cols-1',
          ordered.length === 2 && 'grid-cols-2',
          ordered.length === 3 && 'grid-cols-2 grid-rows-2',
          ordered.length >= 4 && 'grid-cols-2 grid-rows-2',
        )}
      >
        {ordered.map((img, i) => {
          const isThreeFirst = ordered.length === 3 && i === 0
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => openAt(i)}
              className={cn(
                'group relative block overflow-hidden bg-muted',
                ordered.length === 1 && 'aspect-[16/9]',
                ordered.length === 2 && 'aspect-square',
                ordered.length === 3 && 'aspect-square',
                ordered.length === 3 && i === 0 && 'row-span-2 aspect-auto',
                ordered.length >= 4 && 'aspect-square',
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={img.url}
                alt=""
                className={cn(
                  'size-full transition group-hover:scale-[1.02]',
                  ordered.length === 1 ? 'object-cover' : 'object-cover',
                  isThreeFirst && 'object-cover',
                )}
              />
            </button>
          )
        })}
      </div>
      <PostImageLightbox
        images={ordered}
        initialIndex={activeIndex}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

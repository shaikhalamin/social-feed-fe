import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { Loader2, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImageUploadState } from '@/features/media/use-composer-image-uploads'

type Props = {
  items: ImageUploadState[]
  onRemove: (localId: string) => void
  onRetry: (localId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

const THUMB_WIDTH = 80
const SWAP_THRESHOLD = THUMB_WIDTH / 2

export function ComposerImageStrip({
  items,
  onRemove,
  onRetry,
  onReorder,
}: Props) {
  const dragRef = useRef<{
    fromIndex: number
    startX: number
    currentX: number
  } | null>(null)

  if (items.length === 0) return null

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      fromIndex: index,
      startX: e.clientX,
      currentX: e.clientX,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    dragRef.current.currentX = e.clientX
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      return
    }
    const { fromIndex, startX, currentX } = dragRef.current
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    const delta = currentX - startX
    if (Math.abs(delta) < SWAP_THRESHOLD) return
    const offset = Math.trunc(delta / SWAP_THRESHOLD)
    const toIndex = Math.max(0, Math.min(items.length - 1, fromIndex + offset))
    if (toIndex !== fromIndex) onReorder(fromIndex, toIndex)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => {
        const progressPct = Math.round(it.progress * 100)
        return (
          <div
            key={it.localId}
            className="group relative size-20 overflow-hidden rounded-md border bg-muted"
          >
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="block size-full cursor-grab touch-none active:cursor-grabbing"
              aria-label={`Image ${i + 1}`}
            >
              <img
                src={it.previewUrl}
                alt=""
                className="size-full object-cover"
                draggable={false}
              />
            </button>

            {it.status === 'reading' ||
            it.status === 'pending' ||
            it.status === 'uploading' ? (
              <div className="pointer-events-none absolute inset-0 flex items-end bg-black/40">
                <div className="h-1 w-full bg-white/30">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-white" />
              </div>
            ) : null}

            {it.status === 'error' ? (
              <button
                type="button"
                onClick={() => onRetry(it.localId)}
                aria-label="Retry upload"
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-destructive/70 text-destructive-foreground',
                )}
              >
                <RotateCcw className="size-5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onRemove(it.localId)}
              aria-label="Remove image"
              className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/sonner'
import type { CreatePostBody } from '@/gen/api/types/CreatePostBody.ts'
import type {
  PresignBody,
  PresignBodyContentTypesEnumKey,
} from '@/gen/api/types/PresignBody.ts'
import { readImageDimensions } from './read-image-dimensions'
import { uploadToR2 } from './upload-to-r2'
import { usePresignPostUploadsMutation } from './use-presign-post-uploads'

export const MAX_IMAGES_PER_POST = 4
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_CONTENT_TYPES: ReadonlySet<PresignBodyContentTypesEnumKey> =
  new Set(['image/jpeg', 'image/png', 'image/webp'])

function isAllowedContentType(
  value: string,
): value is PresignBodyContentTypesEnumKey {
  return ALLOWED_CONTENT_TYPES.has(value as PresignBodyContentTypesEnumKey)
}

export type ImageUploadStatus =
  | 'reading'
  | 'pending'
  | 'uploading'
  | 'done'
  | 'error'

export type ImageUploadState = {
  localId: string
  file: File
  previewUrl: string
  contentType: PresignBodyContentTypesEnumKey
  status: ImageUploadStatus
  width?: number
  height?: number
  r2Key?: string
  uploadUrl?: string
  expiresAt?: string
  progress: number
  error?: string
}

type RequiredPostImage = NonNullable<CreatePostBody['images']>[number]

export type UseComposerImageUploads = {
  items: ImageUploadState[]
  add: (files: FileList | File[]) => void
  remove: (localId: string) => void
  retry: (localId: string) => void
  reorder: (fromIndex: number, toIndex: number) => void
  reset: () => void
  allDone: boolean
  anyPending: boolean
  postImages: RequiredPostImage[]
}

function nextLocalId(): string {
  return crypto.randomUUID()
}

export function useComposerImageUploads(): UseComposerImageUploads {
  const [items, setItems] = useState<ImageUploadState[]>([])
  const itemsRef = useRef<ImageUploadState[]>([])
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const presign = usePresignPostUploadsMutation()

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      for (const it of itemsRef.current) URL.revokeObjectURL(it.previewUrl)
      for (const ctrl of abortControllersRef.current.values()) ctrl.abort()
    }
  }, [])

  const updateItem = useCallback(
    (localId: string, patch: Partial<ImageUploadState>) => {
      setItems((prev) =>
        prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
      )
    },
    [],
  )

  const startUploadForSlot = useCallback(
    (slot: ImageUploadState) => {
      if (!slot.uploadUrl) return
      if (!itemsRef.current.some((it) => it.localId === slot.localId)) {
        return
      }
      const ctrl = new AbortController()
      abortControllersRef.current.set(slot.localId, ctrl)
      updateItem(slot.localId, { status: 'uploading', progress: 0 })
      uploadToR2(
        slot.uploadUrl,
        slot.file,
        slot.contentType,
        ctrl.signal,
        (loaded, total) =>
          updateItem(slot.localId, {
            progress: total > 0 ? loaded / total : 0,
          }),
      )
        .then(() => {
          abortControllersRef.current.delete(slot.localId)
          updateItem(slot.localId, { status: 'done', progress: 1 })
        })
        .catch((err: unknown) => {
          abortControllersRef.current.delete(slot.localId)
          if (err instanceof DOMException && err.name === 'AbortError') return
          updateItem(slot.localId, {
            status: 'error',
            error: 'Upload failed',
          })
        })
    },
    [updateItem],
  )

  const presignAndUpload = useCallback(
    (slots: ImageUploadState[]) => {
      if (slots.length === 0) return
      const body: PresignBody = {
        count: slots.length,
        contentTypes: slots.map((s) => s.contentType),
      }
      presign.mutate(
        { data: body },
        {
          onSuccess: (response) => {
            const uploads = response.data.uploads
            const matchedCount = Math.min(slots.length, uploads.length)
            for (let i = matchedCount; i < slots.length; i++) {
              updateItem(slots[i].localId, {
                status: 'error',
                error: 'Presign mismatch',
              })
            }
            for (let i = 0; i < matchedCount; i++) {
              const slot = slots[i]
              const entry = uploads[i]
              const next: ImageUploadState = {
                ...slot,
                r2Key: entry.r2Key,
                uploadUrl: entry.uploadUrl,
                expiresAt: entry.expiresAt,
              }
              updateItem(slot.localId, {
                r2Key: entry.r2Key,
                uploadUrl: entry.uploadUrl,
                expiresAt: entry.expiresAt,
              })
              startUploadForSlot(next)
            }
          },
          onError: () => {
            for (const slot of slots) {
              updateItem(slot.localId, {
                status: 'error',
                error: 'Presign failed',
              })
            }
            toast.error("Couldn't prepare upload")
          },
        },
      )
    },
    [presign, startUploadForSlot, updateItem],
  )

  const add = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
      const currentCount = itemsRef.current.length
      const capRemaining = Math.max(0, MAX_IMAGES_PER_POST - currentCount)
      if (capRemaining === 0) {
        toast.info(`Max ${MAX_IMAGES_PER_POST} images per post`)
        return
      }
      const overCap = incoming.length > capRemaining
      const limited = incoming.slice(0, capRemaining)
      const accepted: Array<{
        localId: string
        file: File
        contentType: PresignBodyContentTypesEnumKey
      }> = []
      let rejectedType = false
      let rejectedSize = false
      for (const file of limited) {
        if (!isAllowedContentType(file.type)) {
          rejectedType = true
          continue
        }
        if (file.size > POST_IMAGE_MAX_BYTES) {
          rejectedSize = true
          continue
        }
        accepted.push({
          localId: nextLocalId(),
          file,
          contentType: file.type,
        })
      }
      if (overCap) toast.info(`Max ${MAX_IMAGES_PER_POST} images per post`)
      if (rejectedType) toast.info('Only JPEG, PNG, or WEBP images allowed')
      if (rejectedSize) toast.info('Image must be 10 MB or smaller')
      if (accepted.length === 0) return

      const newSlots: ImageUploadState[] = accepted.map(
        ({ localId, file, contentType }) => ({
          localId,
          file,
          contentType,
          previewUrl: URL.createObjectURL(file),
          status: 'reading',
          progress: 0,
        }),
      )
      setItems((prev) => [...prev, ...newSlots])

      Promise.all(
        newSlots.map((slot) =>
          readImageDimensions(slot.file).then(
            (dims) => ({ slot, dims, ok: true as const }),
            () => ({ slot, ok: false as const }),
          ),
        ),
      ).then((results) => {
        const readySlots: ImageUploadState[] = []
        for (const r of results) {
          if (!r.ok) {
            updateItem(r.slot.localId, {
              status: 'error',
              error: 'Could not read image',
            })
            continue
          }
          updateItem(r.slot.localId, {
            status: 'pending',
            width: r.dims.width,
            height: r.dims.height,
          })
          readySlots.push({
            ...r.slot,
            status: 'pending',
            width: r.dims.width,
            height: r.dims.height,
          })
        }
        presignAndUpload(readySlots)
      })
    },
    [presignAndUpload, updateItem],
  )

  const remove = useCallback((localId: string) => {
    const target = itemsRef.current.find((it) => it.localId === localId)
    if (target) URL.revokeObjectURL(target.previewUrl)
    const ctrl = abortControllersRef.current.get(localId)
    if (ctrl) {
      ctrl.abort()
      abortControllersRef.current.delete(localId)
    }
    setItems((prev) => prev.filter((it) => it.localId !== localId))
  }, [])

  const retry = useCallback(
    (localId: string) => {
      const slot = itemsRef.current.find((it) => it.localId === localId)
      if (!slot || slot.status !== 'error') return
      if (slot.width == null || slot.height == null) {
        updateItem(localId, { status: 'reading', error: undefined })
        readImageDimensions(slot.file).then(
          (dims) => {
            updateItem(localId, {
              status: 'pending',
              width: dims.width,
              height: dims.height,
            })
            presignAndUpload([
              {
                ...slot,
                status: 'pending',
                width: dims.width,
                height: dims.height,
              },
            ])
          },
          () =>
            updateItem(localId, {
              status: 'error',
              error: 'Could not read image',
            }),
        )
        return
      }
      updateItem(localId, { status: 'pending', error: undefined })
      presignAndUpload([{ ...slot, status: 'pending' }])
    },
    [presignAndUpload, updateItem],
  )

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev
      }
      const next = prev.slice()
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    for (const it of itemsRef.current) URL.revokeObjectURL(it.previewUrl)
    for (const ctrl of abortControllersRef.current.values()) ctrl.abort()
    abortControllersRef.current.clear()
    setItems([])
  }, [])

  const allDone = useMemo(
    () => items.length > 0 && items.every((it) => it.status === 'done'),
    [items],
  )
  const anyPending = useMemo(
    () =>
      items.some(
        (it) =>
          it.status === 'reading' ||
          it.status === 'pending' ||
          it.status === 'uploading',
      ),
    [items],
  )
  const postImages = useMemo<RequiredPostImage[]>(
    () =>
      items
        .filter(
          (
            it,
          ): it is ImageUploadState & {
            r2Key: string
            width: number
            height: number
          } =>
            it.status === 'done' &&
            typeof it.r2Key === 'string' &&
            typeof it.width === 'number' &&
            typeof it.height === 'number',
        )
        .map((it, i) => ({
          r2Key: it.r2Key,
          width: it.width,
          height: it.height,
          position: i,
        })),
    [items],
  )

  return {
    items,
    add,
    remove,
    retry,
    reorder,
    reset,
    allDone,
    anyPending,
    postImages,
  }
}

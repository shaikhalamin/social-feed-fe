import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/use-auth'
import { useCreatePostMutation } from '@/features/feed/use-create-post'
import { useComposerImageUploads } from '@/features/media/use-composer-image-uploads'
import type { CreatePostBodyVisibilityEnumKey } from '@/gen/api/types/CreatePostBody.ts'
import { ComposerImageStrip } from './ComposerImageStrip'
import { ComposerVisibilitySelector } from './ComposerVisibilitySelector'

const MAX_CONTENT_LENGTH = 10000

function userInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

export function Composer() {
  const user = useAuthStore((s) => s.user)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] =
    useState<CreatePostBodyVisibilityEnumKey>('public')
  const mutation = useCreatePostMutation()
  const uploads = useComposerImageUploads()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitting = mutation.isPending
  const trimmed = content.trim()
  const hasContent = trimmed.length > 0
  const hasImages = uploads.items.length > 0
  const canSubmit =
    (hasContent || hasImages) &&
    !uploads.anyPending &&
    (!hasImages || uploads.allDone) &&
    !submitting

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      {
        data: {
          content: trimmed,
          visibility,
          images:
            uploads.postImages.length > 0 ? uploads.postImages : undefined,
        },
      },
      {
        onSuccess: () => {
          setContent('')
          setVisibility('public')
          uploads.reset()
        },
      },
    )
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploads.add(e.target.files)
    }
    e.target.value = ''
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''

  return (
    <div className="rounded-lg bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar size="lg">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback>
            {user ? userInitials(user.firstName, user.lastName) : '?'}
          </AvatarFallback>
        </Avatar>
        <textarea
          value={content}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="What's on your mind?"
          maxLength={MAX_CONTENT_LENGTH}
          rows={2}
          className="flex-1 resize-none rounded-md bg-muted/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus:bg-muted focus:outline-none"
        />
      </div>
      {uploads.items.length > 0 ? (
        <div className="mt-3">
          <ComposerImageStrip
            items={uploads.items}
            onRemove={uploads.remove}
            onRetry={uploads.retry}
            onReorder={uploads.reorder}
          />
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFiles}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add image"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ImageIcon className="size-5" />
          </button>
          <ComposerVisibilitySelector
            value={visibility}
            onChange={setVisibility}
            disabled={submitting}
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!canSubmit}
          aria-label={submitting ? 'Posting…' : 'Post'}
          aria-busy={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
        </Button>
      </div>
    </div>
  )
}

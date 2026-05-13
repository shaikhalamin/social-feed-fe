import { useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/use-auth'
import { useCreatePostMutation } from '@/features/feed/use-create-post'

const MAX_CONTENT_LENGTH = 10000

function userInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

export function Composer() {
  const user = useAuthStore((s) => s.user)
  const [content, setContent] = useState('')
  const mutation = useCreatePostMutation()
  const submitting = mutation.isPending
  const trimmed = content.trim()
  const canSubmit = trimmed.length > 0 && !submitting

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      { data: { content: trimmed, visibility: 'public' } },
      {
        onSuccess: () => setContent(''),
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
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toast.info('Image upload coming soon')}
          aria-label="Add image"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <ImageIcon className="size-5" />
        </button>
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
        </Button>
      </div>
    </div>
  )
}

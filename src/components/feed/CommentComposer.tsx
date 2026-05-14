import { forwardRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/hooks/use-auth'
import { useCreateCommentMutation } from '@/features/feed/use-create-comment'

function userInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

type Props = {
  postId: string
}

export const CommentComposer = forwardRef<HTMLTextAreaElement, Props>(
  function CommentComposer({ postId }, ref) {
    const user = useAuthStore((s) => s.user)
    const [content, setContent] = useState('')
    const mutation = useCreateCommentMutation(postId)
    const trimmed = content.trim()
    const canSubmit = trimmed.length > 0 && !mutation.isPending

    const submit = () => {
      if (!canSubmit) return
      const previous = content
      setContent('')
      mutation.mutate(
        { post_id: postId, data: { content: trimmed } },
        {
          onError: () => setContent(previous),
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
      <div className="flex items-start gap-2">
        <Avatar size="sm">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback>
            {user ? userInitials(user.firstName, user.lastName) : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-muted/60 pl-3 pr-1 py-1">
          <textarea
            ref={ref}
            value={content}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Write a comment…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Post comment"
            className="inline-flex size-8 items-center justify-center rounded-full text-primary disabled:text-muted-foreground"
          >
            <SendHorizonal className="size-4" />
          </button>
        </div>
      </div>
    )
  },
)

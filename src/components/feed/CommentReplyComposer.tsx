import { useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useCreateCommentReplyMutation } from '@/features/feed/use-create-comment-reply'

type Props = {
  postId: string
  parentCommentId: string
  onCancel: () => void
  onSuccess: () => void
}

export function CommentReplyComposer({
  postId,
  parentCommentId,
  onCancel,
  onSuccess,
}: Props) {
  const [content, setContent] = useState('')
  const mutation = useCreateCommentReplyMutation(postId, parentCommentId)
  const trimmed = content.trim()
  const canSubmit = trimmed.length > 0 && !mutation.isPending

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      { comment_id: parentCommentId, data: { content: trimmed } },
      { onSuccess: () => onSuccess() },
    )
  }

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mt-2 space-y-2 pl-10">
      <textarea
        value={content}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoFocus
        rows={2}
        placeholder="Write a reply…"
        aria-label="Write a reply"
        className="w-full resize-none rounded-2xl bg-muted px-3 py-2 text-sm focus:outline-none"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={!canSubmit}
        >
          Reply
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/use-auth'
import { useUpdateCommentMutation } from '@/features/feed/use-update-comment'
import type { Comment } from '@/gen/api/types/Comment.ts'
import { CommentOwnerMenu } from './CommentOwnerMenu'
import { CommentLikeButton } from './CommentLikeButton'
import { CommentReplyButton } from './CommentReplyButton'
import { CommentReplyComposer } from './CommentReplyComposer'
import { CommentRepliesList } from './CommentRepliesList'

function authorInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

type Props = {
  comment: Comment
  postId: string
  pending?: boolean
  isReply?: boolean
}

export function CommentRow({
  comment,
  postId,
  pending = false,
  isReply = false,
}: Props) {
  const fullName =
    `${comment.author.firstName} ${comment.author.lastName}`.trim()
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const isOwner = currentUserId === comment.author.id
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [replyOpen, setReplyOpen] = useState(false)
  const [expandSignal, setExpandSignal] = useState(0)
  const updateMutation = useUpdateCommentMutation(postId)

  const trimmed = draft.trim()
  const canSave = trimmed.length > 0 && trimmed !== comment.content

  const startEdit = () => {
    setDraft(comment.content)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setDraft(comment.content)
    setIsEditing(false)
  }

  const save = () => {
    if (!canSave) return
    updateMutation.mutate(
      { id: comment.id, data: { content: trimmed } },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className={cn(isReply && 'pl-10')}>
      <div className={cn('group flex gap-2', pending && 'opacity-70')}>
        <Avatar size="sm">
          <AvatarImage
            src={comment.author.avatarUrl ?? undefined}
            alt={fullName}
          />
          <AvatarFallback>
            {authorInitials(comment.author.firstName, comment.author.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onTextareaKeyDown}
                autoFocus
                rows={2}
                aria-label="Edit comment"
                className="w-full resize-none rounded-2xl bg-muted px-3 py-2 text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={save}
                  disabled={!canSave || updateMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted px-3 py-2">
              <div className="text-sm font-semibold">{fullName}</div>
              <div className="whitespace-pre-line text-sm">
                {comment.content}
              </div>
            </div>
          )}
          <div className="mt-1 flex items-center gap-3 px-3 text-xs text-muted-foreground">
            <span>{formatTimeAgo(comment.createdAt)}</span>
            {comment.isEdited ? <span>· Edited</span> : null}
            <CommentLikeButton comment={comment} postId={postId} />
            {!isReply ? (
              <CommentReplyButton
                onClick={() => setReplyOpen(true)}
                disabled={replyOpen}
              />
            ) : null}
          </div>
        </div>
        {isOwner && !isEditing ? (
          <CommentOwnerMenu
            comment={comment}
            postId={postId}
            onEdit={startEdit}
          />
        ) : null}
      </div>
      {!isReply && replyOpen ? (
        <CommentReplyComposer
          postId={postId}
          parentCommentId={comment.id}
          onCancel={() => setReplyOpen(false)}
          onSuccess={() => setReplyOpen(false)}
          onSubmit={() => setExpandSignal((s) => s + 1)}
        />
      ) : null}
      {!isReply ? (
        <CommentRepliesList
          postId={postId}
          parentCommentId={comment.id}
          replyCount={comment.counters.replies}
          expandSignal={expandSignal}
        />
      ) : null}
    </div>
  )
}

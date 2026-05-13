import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePostLikesPreview } from '@/features/feed/use-post-likes-preview'
import { useCommentLikesPreview } from '@/features/feed/use-comment-likes-preview'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'
import type { ReactionUserSummary } from '@/gen/api/types/ReactionUserSummary.ts'

function viewerInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

function fullName(viewer: ReactionUserSummary): string {
  return [viewer.firstName, viewer.lastName].filter(Boolean).join(' ')
}

type Props = {
  kind: 'post' | 'comment'
  id: string
  embedded: LikesPreview
  children: ReactNode
}

function HoverCardBody({ preview }: { preview: LikesPreview }) {
  const others = preview.count - preview.preview.length
  return (
    <div className="flex w-60 flex-col gap-2">
      {preview.preview.length === 0 ? (
        <div className="text-sm text-muted-foreground">No likers yet.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {preview.preview.map((viewer) => (
            <li key={viewer.id} className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarImage
                  src={viewer.avatarUrl ?? undefined}
                  alt={fullName(viewer)}
                />
                <AvatarFallback>
                  {viewerInitials(viewer.firstName, viewer.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{fullName(viewer)}</span>
            </li>
          ))}
        </ul>
      )}
      {others > 0 ? (
        <div className="border-t pt-2 text-xs text-muted-foreground">
          and {others} {others === 1 ? 'other' : 'others'}
        </div>
      ) : null}
    </div>
  )
}

function PostHoverContent({
  id,
  embedded,
  open,
}: {
  id: string
  embedded: LikesPreview
  open: boolean
}) {
  const { data } = usePostLikesPreview(id, embedded, open)
  return <HoverCardBody preview={data.data} />
}

function CommentHoverContent({
  id,
  embedded,
  open,
}: {
  id: string
  embedded: LikesPreview
  open: boolean
}) {
  const { data } = useCommentLikesPreview(id, embedded, open)
  return <HoverCardBody preview={data.data} />
}

export function LikesPreviewHoverCard({ kind, id, embedded, children }: Props) {
  const [open, setOpen] = useState(false)
  if (embedded.count === 0) return <>{children}</>
  return (
    <HoverCard openDelay={300} closeDelay={150} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="start" className="p-3">
        {kind === 'post' ? (
          <PostHoverContent id={id} embedded={embedded} open={open} />
        ) : (
          <CommentHoverContent id={id} embedded={embedded} open={open} />
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

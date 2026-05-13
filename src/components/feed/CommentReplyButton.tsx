import { Button } from '@/components/ui/button'

type Props = {
  onClick: () => void
  disabled?: boolean
}

export function CommentReplyButton({ onClick, disabled = false }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
    >
      Reply
    </Button>
  )
}

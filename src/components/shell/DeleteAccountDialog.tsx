import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/hooks/use-auth'
import { useDeleteAccount } from '@/features/auth/use-delete-account'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user)
  const [typed, setTyped] = useState('')
  const mutation = useDeleteAccount()
  const email = user?.email ?? ''
  const matches = typed.trim() === email && email.length > 0
  const showMismatch = typed.length > 0 && !matches

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return
    if (!next) setTyped('')
    onOpenChange(next)
  }

  const onConfirm = () => {
    if (!matches || !user) return
    mutation.mutate({ id: user.id })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes your account, posts, comments, and avatar.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <label
            htmlFor="delete-account-confirm"
            className="text-sm text-muted-foreground"
          >
            Type your email to confirm:{' '}
            <strong className="text-foreground">{email}</strong>
          </label>
          <Input
            id="delete-account-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={mutation.isPending}
          />
          {showMismatch ? (
            <p className="text-xs text-destructive">
              The email doesn&apos;t match.
            </p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!matches || mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

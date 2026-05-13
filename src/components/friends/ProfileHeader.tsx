import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Camera, Loader2, MessageCircle, Pencil } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { useCommitAvatarMutation } from '@/features/media/use-commit-avatar'
import { usePresignAvatarMutation } from '@/features/media/use-presign-avatar'
import { uploadToR2 } from '@/features/media/upload-to-r2'
import { useUpdateUserMutation } from '@/features/profile/use-update-user'
import { FriendshipButton } from './FriendshipButton'
import type { User } from '@/gen/api/types/User.ts'
import type { PresignAvatarBodyContentTypeEnumKey } from '@/gen/api/types/PresignAvatarBody.ts'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES: ReadonlySet<PresignAvatarBodyContentTypeEnumKey> =
  new Set(['image/jpeg', 'image/png', 'image/webp'])

function isAllowedAvatarType(
  value: string,
): value is PresignAvatarBodyContentTypeEnumKey {
  return ALLOWED_AVATAR_TYPES.has(value as PresignAvatarBodyContentTypeEnumKey)
}

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

type Props = { user: User }

export function ProfileHeader({ user }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const isSelf = currentUserId === user.id

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = userInitials(user.firstName, user.lastName)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const presignAvatar = usePresignAvatarMutation()
  const commitAvatar = useCommitAvatarMutation()
  const [isUploading, setIsUploading] = useState(false)
  const avatarBusy =
    isUploading || presignAvatar.isPending || commitAvatar.isPending

  const updateUser = useUpdateUserMutation()
  const [isEditingName, setIsEditingName] = useState(false)
  const [firstNameDraft, setFirstNameDraft] = useState(user.firstName)
  const [lastNameDraft, setLastNameDraft] = useState(user.lastName)

  const trimmedFirst = firstNameDraft.trim()
  const trimmedLast = lastNameDraft.trim()
  const nameChanged =
    trimmedFirst !== user.firstName || trimmedLast !== user.lastName
  const canSaveName =
    trimmedFirst.length > 0 && trimmedLast.length > 0 && nameChanged

  const startEditName = () => {
    setFirstNameDraft(user.firstName)
    setLastNameDraft(user.lastName)
    setIsEditingName(true)
  }

  const cancelEditName = () => {
    setFirstNameDraft(user.firstName)
    setLastNameDraft(user.lastName)
    setIsEditingName(false)
  }

  const saveName = () => {
    if (!canSaveName) return
    updateUser.mutate(
      {
        id: user.id,
        data: { firstName: trimmedFirst, lastName: trimmedLast },
      },
      { onSuccess: () => setIsEditingName(false) },
    )
  }

  const onNameInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditName()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      saveName()
    }
  }

  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isAllowedAvatarType(file.type)) {
      toast.info('Only JPEG, PNG, or WEBP avatars allowed')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.info('Avatar must be 5 MB or smaller')
      return
    }
    setIsUploading(true)
    try {
      const presigned = await presignAvatar.mutateAsync({
        id: user.id,
        data: { contentType: file.type },
      })
      await uploadToR2(
        presigned.data.uploadUrl,
        file,
        presigned.data.contentType,
      )
      await commitAvatar.mutateAsync({
        id: user.id,
        data: { objectKey: presigned.data.objectKey },
      })
    } catch {
      toast.error("Couldn't update avatar")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-20">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={fullName} />
            ) : null}
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          {isSelf ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void onPickAvatar(e)
                }}
                className="hidden"
              />
              <button
                type="button"
                aria-label="Change avatar"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card hover:bg-primary/90 disabled:opacity-70"
              >
                <Camera className="size-3.5" />
              </button>
              {avatarBusy ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="size-6 animate-spin text-white" />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {isSelf && isEditingName ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={firstNameDraft}
                onChange={(e) => setFirstNameDraft(e.target.value)}
                onKeyDown={onNameInputKeyDown}
                placeholder="First name"
                aria-label="First name"
                maxLength={60}
                autoFocus
                className="h-9 sm:w-40"
              />
              <Input
                value={lastNameDraft}
                onChange={(e) => setLastNameDraft(e.target.value)}
                onKeyDown={onNameInputKeyDown}
                placeholder="Last name"
                aria-label="Last name"
                maxLength={60}
                className="h-9 sm:w-40"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={saveName}
                  disabled={!canSaveName || updateUser.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditName}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold">{fullName}</h1>
              {isSelf ? (
                <button
                  type="button"
                  onClick={startEditName}
                  aria-label="Edit name"
                  className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </div>
        {!isSelf ? (
          <div className="flex items-center gap-2">
            <FriendshipButton user={user} variant="primary" />
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => toast.info('Messaging coming soon')}
            >
              <MessageCircle className="mr-2 size-4" />
              Message
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

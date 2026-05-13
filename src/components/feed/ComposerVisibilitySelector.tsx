import { ChevronDown, Globe2, Lock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CreatePostBodyVisibilityEnumKey } from '@/gen/api/types/CreatePostBody.ts'

type Props = {
  value: CreatePostBodyVisibilityEnumKey
  onChange: (next: CreatePostBodyVisibilityEnumKey) => void
  disabled?: boolean
}

export function ComposerVisibilitySelector({
  value,
  onChange,
  disabled,
}: Props) {
  const Icon = value === 'public' ? Globe2 : Lock
  const label = value === 'public' ? 'Public' : 'Private'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
          aria-label={`Visibility: ${label}`}
        >
          <Icon className="size-3.5" />
          <span>{label}</span>
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) =>
            onChange(v === 'private' ? 'private' : 'public')
          }
        >
          <DropdownMenuRadioItem value="public">
            <Globe2 className="size-4" />
            Public
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="private">
            <Lock className="size-4" />
            Private
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

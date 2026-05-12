import { useState } from "react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BellIcon } from "@/components/shell/icons"
import {
  SAMPLE_NOTIFICATIONS,
  type SampleNotification,
} from "@/data/sample-shell"

function NotificationRow({ row }: { row: SampleNotification }) {
  return (
    <button
      type="button"
      onClick={() => toast.info("Open notification coming soon")}
      className="flex w-full items-start gap-3 rounded-md p-3 text-left hover:bg-muted"
    >
      <img
        src={row.actorAvatar}
        alt=""
        className="size-10 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{row.actorName}</span>{" "}
          {row.text}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{row.timeAgo}</p>
      </div>
    </button>
  )
}

export function NotificationsBell() {
  const [tab, setTab] = useState<"all" | "unread">("all")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-accent"
        >
          <BellIcon />
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[18px] text-destructive-foreground">
            6
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-base font-semibold">Notifications</h4>
          <button
            type="button"
            onClick={() => toast.info("Notifications menu coming soon")}
            aria-label="Notifications options"
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="4"
              height="17"
              fill="none"
              viewBox="0 0 4 17"
            >
              <circle cx="2" cy="2" r="2" fill="currentColor" />
              <circle cx="2" cy="8" r="2" fill="currentColor" />
              <circle cx="2" cy="15" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-full px-3 py-1 text-sm ${tab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={`rounded-full px-3 py-1 text-sm ${tab === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Unread
          </button>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="space-y-1 p-2">
            {SAMPLE_NOTIFICATIONS.map((row) => (
              <NotificationRow key={row.id} row={row} />
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

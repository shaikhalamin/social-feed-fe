import { toast } from "sonner"
import {
  BookmarksIcon,
  FindFriendsIcon,
  GamingIcon,
  GroupIcon,
  InsightsIcon,
  LearningIcon,
  SavePostIcon,
  SettingsIcon,
} from "@/components/shell/icons"
import {
  EXPLORE_LINKS,
  type ExploreIconName,
} from "@/data/sample-shell"

const ICON_BY_NAME: Record<ExploreIconName, React.ComponentType<{ className?: string }>> = {
  learning: LearningIcon,
  insights: InsightsIcon,
  "find-friends": FindFriendsIcon,
  bookmarks: BookmarksIcon,
  group: GroupIcon,
  gaming: GamingIcon,
  settings: SettingsIcon,
  "save-post": SavePostIcon,
}

export function ExploreCard() {
  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <h4 className="mb-6 text-base font-semibold">Explore</h4>
      <ul className="space-y-3">
        {EXPLORE_LINKS.map((link) => {
          const Icon = ICON_BY_NAME[link.iconName]
          return (
            <li key={link.label}>
              <button
                type="button"
                onClick={() => toast.info(`${link.label} coming soon`)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                <Icon className="text-muted-foreground" />
                <span className="flex-1 text-left">{link.label}</span>
                {link.badge ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {link.badge}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

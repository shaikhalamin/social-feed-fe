export type ExploreIconName =
  | "learning"
  | "insights"
  | "find-friends"
  | "bookmarks"
  | "group"
  | "gaming"
  | "settings"
  | "save-post"

export type ExploreLink = {
  label: string
  iconName: ExploreIconName
  badge?: "New"
}

export const EXPLORE_LINKS: ExploreLink[] = [
  { label: "Learning", iconName: "learning", badge: "New" },
  { label: "Insights", iconName: "insights" },
  { label: "Find friends", iconName: "find-friends" },
  { label: "Bookmarks", iconName: "bookmarks" },
  { label: "Group", iconName: "group" },
  { label: "Gaming", iconName: "gaming", badge: "New" },
  { label: "Settings", iconName: "settings" },
  { label: "Save post", iconName: "save-post" },
]

export type NotificationKind = "post" | "group" | "friend-request"

export type SampleNotification = {
  id: string
  kind: NotificationKind
  actorName: string
  actorAvatar: string
  text: string
  timeAgo: string
}

export const SAMPLE_NOTIFICATIONS: SampleNotification[] = [
  {
    id: "n1",
    kind: "post",
    actorName: "Steve Jobs",
    actorAvatar: "/shell/friend-req.png",
    text: "posted a link in your timeline.",
    timeAgo: "42 minutes ago",
  },
  {
    id: "n2",
    kind: "group",
    actorName: "Freelancer USA",
    actorAvatar: "/shell/profile-1.png",
    text: "An admin changed the name of the group Freelancer USA.",
    timeAgo: "42 minutes ago",
  },
  {
    id: "n3",
    kind: "post",
    actorName: "Steve Jobs",
    actorAvatar: "/shell/friend-req.png",
    text: "posted a link in your timeline.",
    timeAgo: "1 hour ago",
  },
  {
    id: "n4",
    kind: "group",
    actorName: "Freelancer USA",
    actorAvatar: "/shell/profile-1.png",
    text: "An admin changed the name of the group Freelancer USA.",
    timeAgo: "2 hours ago",
  },
  {
    id: "n5",
    kind: "friend-request",
    actorName: "Steve Jobs",
    actorAvatar: "/shell/friend-req.png",
    text: "sent you a friend request.",
    timeAgo: "3 hours ago",
  },
  {
    id: "n6",
    kind: "post",
    actorName: "Steve Jobs",
    actorAvatar: "/shell/friend-req.png",
    text: "posted a link in your timeline.",
    timeAgo: "5 hours ago",
  },
  {
    id: "n7",
    kind: "group",
    actorName: "Freelancer USA",
    actorAvatar: "/shell/profile-1.png",
    text: "An admin changed the name of the group Freelancer USA.",
    timeAgo: "Yesterday",
  },
  {
    id: "n8",
    kind: "post",
    actorName: "Steve Jobs",
    actorAvatar: "/shell/friend-req.png",
    text: "posted a link in your timeline.",
    timeAgo: "Yesterday",
  },
]

export type SampleStory = {
  id: string
  name: string
  avatar: string
  isOwn?: boolean
}

export const SAMPLE_STORIES: SampleStory[] = [
  { id: "s0", name: "Your Story", avatar: "/shell/Avatar.png", isOwn: true },
  { id: "s1", name: "Steve", avatar: "/shell/mobile_story_img.png" },
  { id: "s2", name: "Ryan", avatar: "/shell/mobile_story_img1.png" },
  { id: "s3", name: "Dylan", avatar: "/shell/mobile_story_img2.png" },
]

export type SampleEvent = {
  id: string
  title: string
  day: string
  month: string
  image: string
  attendeesText: string
}

export const SAMPLE_EVENTS: SampleEvent[] = [
  {
    id: "e1",
    title: "No more terrorism no more cry",
    day: "10",
    month: "Jul",
    image: "/shell/feed_event1.png",
    attendeesText: "17 People Going",
  },
  {
    id: "e2",
    title: "No more terrorism no more cry",
    day: "10",
    month: "Jul",
    image: "/shell/feed_event1.png",
    attendeesText: "17 People Going",
  },
]

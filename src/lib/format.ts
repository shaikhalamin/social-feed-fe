const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = MS_PER_MINUTE * 60
const MS_PER_DAY = MS_PER_HOUR * 24
const MS_PER_WEEK = MS_PER_DAY * 7

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()

  if (diff < MS_PER_MINUTE) return 'just now'
  if (diff < MS_PER_HOUR) {
    const m = Math.floor(diff / MS_PER_MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < MS_PER_DAY) {
    const h = Math.floor(diff / MS_PER_HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  if (diff < MS_PER_WEEK) {
    const d = Math.floor(diff / MS_PER_DAY)
    return `${d} day${d === 1 ? '' : 's'} ago`
  }

  const month = MONTH_NAMES[then.getMonth()]
  const day = then.getDate()
  return then.getFullYear() === now.getFullYear()
    ? `${month} ${day}`
    : `${month} ${day}, ${then.getFullYear()}`
}

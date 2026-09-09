import type { Engagement } from '../types/domain'

export function engagementStartSortValue(engagement: Engagement) {
  if (engagement.event_start) return new Date(engagement.event_start).getTime()
  if (engagement.event_start_date) return dateOnlyToLocalDate(engagement.event_start_date).getTime()
  return null
}

export function formatEngagementDate(engagement: Engagement, includeTime = false) {
  if (engagement.event_start) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    }).format(new Date(engagement.event_start))
  }
  if (engagement.event_start_date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateOnlyToLocalDate(engagement.event_start_date))
  }
  return 'Date unknown'
}

function dateOnlyToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

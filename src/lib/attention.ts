import type { Engagement } from '../types/domain'

const TERMINAL_COMMERCIAL = new Set(['LOST'])
const TERMINAL_OPERATIONAL = new Set(['CLOSED'])

export function isTerminalEngagement(engagement: Engagement) {
  return (
    TERMINAL_COMMERCIAL.has(engagement.commercial_state) ||
    TERMINAL_OPERATIONAL.has(engagement.operational_state) ||
    engagement.commitment_state === 'CANCELLED' ||
    Boolean(engagement.archived_at)
  )
}

export function isDue(engagement: Engagement, now = new Date()) {
  return Boolean(engagement.next_action_at && new Date(engagement.next_action_at).getTime() <= now.getTime())
}

export function needsHumanAttention(engagement: Engagement, now = new Date()) {
  if (isTerminalEngagement(engagement)) return false
  if (engagement.attention_state === 'BLOCKED' || engagement.attention_state === 'NEEDS_ATTENTION') return true
  if (isDue(engagement, now)) return true
  if (engagement.attention_state === 'WAITING') return false
  return !engagement.next_action
}

export function isWaiting(engagement: Engagement, now = new Date()) {
  return !isTerminalEngagement(engagement) && engagement.attention_state === 'WAITING' && !isDue(engagement, now)
}

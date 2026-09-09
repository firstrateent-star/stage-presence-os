import type { Engagement } from '../types/domain'

const IMPORT_PLACEHOLDER_ACTIONS = new Set([
  'Review operational readiness',
  'Review quote status and set follow-up',
])

export function hasMeaningfulNextAction(engagement: Engagement) {
  const action = engagement.next_action?.trim()
  return Boolean(action && !IMPORT_PLACEHOLDER_ACTIONS.has(action))
}

export function businessNextMovement(engagement: Engagement) {
  if (engagement.attention_state === 'BLOCKED' && engagement.blocked_reason) {
    return `Blocked — ${engagement.blocked_reason}`
  }
  if (engagement.attention_state === 'WAITING' && engagement.waiting_on) {
    return `Waiting on ${engagement.waiting_on}`
  }
  if (hasMeaningfulNextAction(engagement)) return engagement.next_action!.trim()

  if (engagement.commercial_state === 'PROPOSED' || engagement.commercial_state === 'NEGOTIATING') {
    return 'Proposal is active; next real commercial movement has not been captured yet.'
  }

  if (engagement.commercial_state === 'WON' || ['SIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'].includes(engagement.commitment_state)) {
    return 'Committed work; protect delivery and capture the next real operational movement when known.'
  }

  if (engagement.commercial_state === 'DESIGNING') return 'Continue shaping the solution until it is ready to quote.'
  if (engagement.commercial_state === 'DISCOVERY') return 'Clarify only what is needed to design the next responsible solution.'
  return 'Next meaningful movement has not been captured yet.'
}

export function importedScopeFallback(engagement: Engagement, configuredCount: number) {
  const hasNeed = Boolean(engagement.desired_outcome?.trim() || engagement.customer_request?.trim())
  if (hasNeed) return null
  if (engagement.source_key?.startsWith('goodshuffle:') && configuredCount > 0) {
    return 'The original customer request was not preserved in the imported evidence. The current configured solution below is the best represented scope.'
  }
  return 'The customer need has not been explicitly captured yet.'
}

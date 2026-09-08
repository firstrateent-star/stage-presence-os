export type EngagementType =
  | 'EVENT'
  | 'LONG_TERM_RENTAL'
  | 'INSTALLATION'
  | 'EQUIPMENT_SALE'
  | 'SERVICE'
  | 'OTHER'

export type CommercialState =
  | 'NEW'
  | 'DISCOVERY'
  | 'DESIGNING'
  | 'PROPOSED'
  | 'NEGOTIATING'
  | 'WON'
  | 'LOST'

export type CommitmentState =
  | 'UNCOMMITTED'
  | 'VERBAL_YES'
  | 'SIGNED'
  | 'DEPOSIT_PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'

export type OperationalState =
  | 'NOT_STARTED'
  | 'PLANNING'
  | 'READY'
  | 'ACTIVE'
  | 'COMPLETE'
  | 'CLOSED'

export type AttentionState = 'NORMAL' | 'NEEDS_ATTENTION' | 'WAITING' | 'BLOCKED'
export type MemberRole = 'ADMIN' | 'COMMERCIAL' | 'OPERATIONS' | 'VIEWER'

export interface Engagement {
  id: string
  engagement_number: string
  name: string
  engagement_type: EngagementType
  customer_request: string | null
  desired_outcome: string | null
  internal_summary: string | null
  event_start: string | null
  event_end: string | null
  venue_name: string | null
  venue_address: string | null
  estimated_value: number | null
  commercial_state: CommercialState
  commitment_state: CommitmentState
  operational_state: OperationalState
  attention_state: AttentionState
  next_action: string | null
  next_action_at: string | null
  next_action_owner_id: string | null
  waiting_on: string | null
  blocked_reason: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type FactCategory =
  | 'EVENT'
  | 'VISUAL'
  | 'AUDIO'
  | 'LIGHTING'
  | 'STAGING'
  | 'POWER'
  | 'NETWORK'
  | 'VENUE'
  | 'LOGISTICS'
  | 'LABOR'
  | 'CONTENT'
  | 'CUSTOMER'
  | 'OTHER'

export type FactKind =
  | 'REQUIREMENT'
  | 'CONSTRAINT'
  | 'CUSTOMER_REQUEST'
  | 'OBSERVATION'
  | 'ASSUMPTION'
  | 'PREFERENCE'
  | 'OTHER'

export type CertaintyState =
  | 'VERIFIED'
  | 'KNOWN'
  | 'ESTIMATED'
  | 'ASSUMED'
  | 'UNKNOWN'
  | 'REQUESTED'
  | 'CONFLICTING'
  | 'OBSOLETE'
  | 'NOT_APPLICABLE'

export interface EngagementFact {
  id: string
  engagement_id: string
  category: FactCategory
  kind: FactKind
  label: string
  value_text: string | null
  certainty_state: CertaintyState
  confidence: number | null
  source_type: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type ResourceCategory =
  | 'VIDEO'
  | 'AUDIO'
  | 'LIGHTING'
  | 'STAGING'
  | 'RIGGING'
  | 'POWER'
  | 'NETWORKING'
  | 'TRANSPORT'
  | 'OTHER'

export interface Resource {
  id: string
  name: string
  category: ResourceCategory
  resource_type: string | null
  sourcing_model: 'OWNED' | 'SUBCONTRACTED' | 'PARTNER' | 'VENUE' | 'UNKNOWN'
  quantity: number | null
  quantity_state: 'VERIFIED' | 'UNVERIFIED' | 'ESTIMATED' | 'UNKNOWN'
  condition_state: string | null
  reference_price: number | null
  price_basis: string | null
  price_state: 'VERIFIED_CURRENT' | 'LEGACY_REFERENCE' | 'ESTIMATED' | 'UNKNOWN'
  source: string | null
  notes: string | null
  active: boolean
}

export interface LedgerEvent {
  id: string
  engagement_id: string | null
  entity_type: string
  entity_id: string | null
  event_type: string
  actor_user_id: string | null
  actor_label: string | null
  summary: string | null
  metadata: Record<string, unknown>
  created_at: string
}

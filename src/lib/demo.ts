import type { Engagement, LedgerEvent, Resource } from '../types/domain'

function demoDate(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86400000)
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

const demoOneStart = demoDate(5)
const demoTwoStart = demoDate(12)

export const demoEngagements: Engagement[] = [
  {
    id: 'demo-engagement-1',
    engagement_number: 'DEMO-001',
    source_key: null,
    name: 'DEMO — Outdoor Community Event',
    engagement_type: 'EVENT',
    customer_request: 'Large outdoor screen and basic audio',
    desired_outcome: 'Audience can clearly see sponsor content and hear announcements.',
    internal_summary: 'Synthetic record for UI preview only.',
    event_start: demoOneStart.toISOString(),
    event_end: null,
    event_start_date: dateOnly(demoOneStart),
    event_end_date: null,
    venue_name: 'Demo Venue',
    venue_address: null,
    estimated_value: null,
    commercial_state: 'DISCOVERY',
    commitment_state: 'UNCOMMITTED',
    operational_state: 'NOT_STARTED',
    attention_state: 'WAITING',
    next_action: 'Follow up for power information',
    next_action_at: new Date(Date.now() + 86400000).toISOString(),
    next_action_owner_id: null,
    waiting_on: 'Customer power details',
    blocked_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
  {
    id: 'demo-engagement-2',
    engagement_number: 'DEMO-002',
    source_key: null,
    name: 'DEMO — Repeat Visual Rental',
    engagement_type: 'EVENT',
    customer_request: 'Same display package as last year',
    desired_outcome: null,
    internal_summary: 'Synthetic record for UI preview only.',
    event_start: demoTwoStart.toISOString(),
    event_end: null,
    event_start_date: dateOnly(demoTwoStart),
    event_end_date: null,
    venue_name: null,
    venue_address: null,
    estimated_value: null,
    commercial_state: 'NEW',
    commitment_state: 'UNCOMMITTED',
    operational_state: 'NOT_STARTED',
    attention_state: 'NEEDS_ATTENTION',
    next_action: null,
    next_action_at: null,
    next_action_owner_id: null,
    waiting_on: null,
    blocked_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
]

export const demoResources: Resource[] = [
  {
    id: 'demo-resource-1',
    name: 'DEMO — 17×10 LED Trailer',
    category: 'VIDEO',
    resource_type: 'LED_TRAILER',
    sourcing_model: 'OWNED',
    quantity: 1,
    quantity_state: 'UNVERIFIED',
    condition_state: 'UNKNOWN',
    reference_price: 3500,
    price_basis: 'event starting reference',
    price_state: 'LEGACY_REFERENCE',
    source: 'DEMO ONLY — modeled after reference inventory shape',
    notes: 'Not real imported business data.',
    active: true,
  },
]

export const demoEvents: LedgerEvent[] = [
  {
    id: 'demo-event-1',
    engagement_id: 'demo-engagement-1',
    entity_type: 'engagement',
    entity_id: 'demo-engagement-1',
    event_type: 'DEMO_EVENT',
    actor_user_id: null,
    actor_label: 'Demo',
    summary: 'Synthetic activity shown only while backend is unconfigured.',
    metadata: {},
    created_at: new Date().toISOString(),
  },
]

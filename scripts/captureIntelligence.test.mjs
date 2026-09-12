import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretCapture } from '../src/lib/captureIntelligence.ts'

const teamMembers = [
  { id: 'scott', username: 'scott', display_name: 'Scott', member_type: 'CONTRACTOR', primary_role: 'LED_TECH', capabilities: [] },
  { id: 'ben', username: 'ben', display_name: 'Ben', member_type: 'CONTRACTOR', primary_role: 'VIDEO_TECH', capabilities: [] },
  { id: 'greg', username: 'greg', display_name: 'Greg Walker', member_type: 'EMPLOYEE', primary_role: 'SALES_LEAD', capabilities: [] },
]

const resourceCandidates = [
  {
    link_id: 'link-17x10',
    resource_id: 'resource-17x10',
    relationship: 'CONFIGURED',
    quantity: 1,
    required_from_date: '2026-09-19',
    required_through_date: '2026-09-19',
    requirement_window_state: 'KNOWN',
    planned_sourcing_model: 'OWNED',
    resource: { id: 'resource-17x10', name: '17×10 LED Trailer', category: 'VIDEO', quantity: 1, quantity_state: 'UNVERIFIED' },
  },
]

function interpret(text, eventDate = '2026-09-19') {
  return interpretCapture({ text, eventDate, teamMembers, resourceCandidates })
}

test('confirmed crew, timing, committed resource and reported payment become separate proposals', () => {
  const result = interpret('Scott and Ben confirmed Saturday. Load-in 9am. Taking the 17x10 trailer. Balance came in yesterday for $2,500.')
  assert.deepEqual(result.proposals.filter(p => p.kind === 'CREW_CONFIRMATION').map(p => p.payload.teamMemberId).sort(), ['ben', 'scott'])
  assert.equal(result.proposals.some(p => p.kind === 'SCHEDULE' && p.payload.scheduleType === 'LOAD_IN'), true)
  assert.equal(result.proposals.some(p => p.kind === 'RESOURCE_RESERVATION'), true)
  const payment = result.proposals.find(p => p.kind === 'PAYMENT_REPORT')
  assert.ok(payment && payment.kind === 'PAYMENT_REPORT')
  assert.equal(payment.payload.amount, 2500)
  assert.equal(result.unknowns.some(value => value.includes('verification')), true)
})

test('sales lead label is not inferred as field crew', () => {
  const result = interpret('Sales Lead: Greg Walker. Client confirmed the quote.')
  assert.equal(result.proposals.some(p => p.kind === 'CREW_CONFIRMATION' && p.payload.teamMemberId === 'greg'), false)
})

test('resource mention without commitment language does not create a reservation proposal', () => {
  const result = interpret('Need pricing options for the 17x10 trailer before we decide.')
  assert.equal(result.proposals.some(p => p.kind === 'RESOURCE_RESERVATION'), false)
})

test('reported balance without amount stays unresolved and never becomes verified collection', () => {
  const result = interpret('Balance paid yesterday.')
  const payment = result.proposals.find(p => p.kind === 'PAYMENT_REPORT')
  assert.ok(payment && payment.kind === 'PAYMENT_REPORT')
  assert.equal(payment.payload.amount, null)
  assert.equal(payment.authority, 'SUGGEST')
  assert.equal(result.unknowns.some(value => value.includes('amount')), true)
  assert.equal(result.unknowns.some(value => value.includes('verification')), true)
})

test('time without an Engagement date does not invent a date', () => {
  const result = interpret('Load-in 10am.', null)
  const schedule = result.proposals.find(p => p.kind === 'SCHEDULE')
  assert.ok(schedule && schedule.kind === 'SCHEDULE')
  assert.equal(schedule.payload.startAt, null)
})

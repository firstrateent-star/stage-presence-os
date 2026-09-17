import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretCapture } from '../src/lib/captureIntelligence.ts'
import { buildCaptureReviewMetadata } from '../src/lib/captureReviewModel.ts'

const teamMembers = [
  { id: 'scott', username: 'scott', display_name: 'Scott', member_type: 'CONTRACTOR', primary_role: 'LED_TECH', capabilities: [] },
  { id: 'ben', username: 'ben', display_name: 'Ben', member_type: 'CONTRACTOR', primary_role: 'VIDEO_TECH', capabilities: [] },
  { id: 'greg', username: 'greg', display_name: 'Greg Walker', member_type: 'EMPLOYEE', primary_role: 'SALES_LEAD', capabilities: [] },
]

const resourceCandidates = [
  {
    link_id: 'link-17x10', resource_id: 'resource-17x10', relationship: 'CONFIGURED', quantity: 1,
    required_from_date: '2026-09-19', required_through_date: '2026-09-19', requirement_window_state: 'KNOWN', planned_sourcing_model: 'OWNED',
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
  assert.equal(result.unknowns.some(value => value.code === 'PAYMENT_VERIFICATION'), true)
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
  const amountUnknown = result.unknowns.find(value => value.code === 'PAYMENT_AMOUNT')
  const verificationUnknown = result.unknowns.find(value => value.code === 'PAYMENT_VERIFICATION')
  assert.ok(amountUnknown)
  assert.ok(verificationUnknown)
  assert.equal(amountUnknown.decisionLeverage, 'HIGH')
  assert.equal(verificationUnknown.decisionLeverage, 'HIGH')
})

test('time without an Engagement date does not invent a date and emits a routable unknown', () => {
  const result = interpret('Load-in 10am.', null)
  const schedule = result.proposals.find(p => p.kind === 'SCHEDULE')
  assert.ok(schedule && schedule.kind === 'SCHEDULE')
  assert.equal(schedule.payload.startAt, null)
  const dateUnknown = result.unknowns.find(value => value.code === 'SCHEDULE_DATE')
  assert.ok(dateUnknown)
  assert.equal(dateUnknown.category, 'LOGISTICS')
})

test('reported job completion becomes a reviewed DELIVERY closeout without inventing outcome quality', () => {
  const interpretation = interpret('we finished this job')
  const closeout = interpretation.proposals.find(p => p.kind === 'CLOSEOUT')
  assert.ok(closeout && closeout.kind === 'CLOSEOUT')
  assert.equal(closeout.authority, 'REVERSIBLE')
  assert.equal(closeout.requiresHumanReview, true)
  assert.equal(closeout.payload.closeoutKind, 'DELIVERY')
  assert.equal(closeout.payload.actualOutcome, 'UNKNOWN')
  assert.equal(closeout.payload.solutionChanged, null)
  assert.equal(closeout.payload.recurrenceSignal, 'UNKNOWN')

  const metadata = buildCaptureReviewMetadata({
    interpretation,
    proposalDecisions: { [closeout.id]: 'APPROVE' },
    unknownDecisions: {},
  })
  assert.equal(metadata.counts.approved, 1)
  assert.equal(metadata.proposals.find(row => row.id === closeout.id)?.decision, 'APPROVE')
})

test('future or conditional completion language does not create a closeout', () => {
  for (const text of ['When we finish this job, review it.', 'We will finish this job tomorrow.', 'We need to complete the job first.']) {
    const result = interpret(text)
    assert.equal(result.proposals.some(p => p.kind === 'CLOSEOUT'), false, text)
  }
})

test('unreviewed is not treated as rejected in Capture review evidence', () => {
  const interpretation = interpret('Scott and Ben confirmed Saturday. Load-in 9am. Taking the 17x10 trailer.')
  const scott = interpretation.proposals.find(p => p.kind === 'CREW_CONFIRMATION' && p.payload.teamMemberId === 'scott')
  const ben = interpretation.proposals.find(p => p.kind === 'CREW_CONFIRMATION' && p.payload.teamMemberId === 'ben')
  assert.ok(scott && ben)
  const metadata = buildCaptureReviewMetadata({
    interpretation,
    proposalDecisions: { [scott.id]: 'APPROVE', [ben.id]: 'REJECT' },
    unknownDecisions: {},
    rejectionNotes: { [ben.id]: 'Ben was discussed but is not confirmed.' },
  })
  assert.equal(metadata.counts.approved, 1)
  assert.equal(metadata.counts.rejected, 1)
  assert.equal(metadata.counts.unreviewed, interpretation.proposals.filter(p => p.kind !== 'PAYMENT_REPORT').length - 2)
  assert.equal(metadata.proposals.find(row => row.id === ben.id)?.rejection_note, 'Ben was discussed but is not confirmed.')
})

test('payment proposal is held non-actionable and unknown review preserves track/defer distinction', () => {
  const interpretation = interpret('Balance paid yesterday.')
  const amountUnknown = interpretation.unknowns.find(value => value.code === 'PAYMENT_AMOUNT')
  const verificationUnknown = interpretation.unknowns.find(value => value.code === 'PAYMENT_VERIFICATION')
  assert.ok(amountUnknown && verificationUnknown)
  const metadata = buildCaptureReviewMetadata({
    interpretation,
    proposalDecisions: {},
    unknownDecisions: { [amountUnknown.id]: 'TRACK', [verificationUnknown.id]: 'DEFER' },
  })
  assert.equal(metadata.counts.held_non_actionable, 1)
  assert.equal(metadata.counts.unknown_tracked, 1)
  assert.equal(metadata.counts.unknown_deferred, 1)
})
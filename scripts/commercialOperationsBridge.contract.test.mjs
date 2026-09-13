import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

test('commercial operations bridge separates acceptance, holds, reservations, crew and payment commitments', () => {
  const migration = read('supabase/migrations/20260913001500_commercial_operations_bridge_v1.sql')
  const runtime = read('src/lib/commercialOperationsBridge.ts')

  for (const view of ['accepted_scope_commitment_coverage_v', 'engagement_commitment_bridge_v']) {
    assert.match(migration, new RegExp(`create or replace view public\\.${view}[\\s\\S]*security_invoker\\s*=\\s*true`, 'i'))
  }

  for (const state of [
    'NOT_COMMERCIALLY_COMMITTED',
    'REQUIREMENT_WINDOW_NEEDED',
    'RESOURCE_COMMITMENT_NEEDED',
    'RESOURCE_COMMITMENT_REPRESENTED',
    'RESOURCE_WINDOWS_NEEDED',
    'RESOURCE_COMMITMENTS_NEEDED',
    'ACCEPTED_SCOPE_BASELINE_REPRESENTED',
  ]) {
    assert.match(migration, new RegExp(state), `${state} must remain an explicit bridge state`)
  }

  assert.match(runtime, /export async function acceptQuote\b/)
  assert.match(runtime, /export async function createTentativeResourceHoldFromQuoteLine\b/)
  assert.match(runtime, /export async function confirmResourceReservation\b/)
  assert.match(runtime, /export async function createCrewAssignment\b/)
  assert.match(runtime, /export async function createPaymentScheduleTerm\b/)
  assert.match(runtime, /Resource commitment needs an explicit requirement window/)
  assert.match(runtime, /Owned Resource quantity is not VERIFIED/)
  assert.match(runtime, /allowCapacityConflict/)
  assert.match(runtime, /commitment_state: 'DEPOSIT_PENDING'/)
})

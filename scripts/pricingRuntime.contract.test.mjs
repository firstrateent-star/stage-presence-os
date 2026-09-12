import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

test('pricing runtime preserves policy vs proposed sale and exposes coverage', () => {
  const migration = read('supabase/migrations/20260912234500_pricing_runtime_v1.sql')
  const runtime = read('src/lib/pricingRuntime.ts')

  for (const column of [
    'fulfillment_line_id',
    'pricing_rule_id',
    'policy_amount_snapshot',
    'policy_total_snapshot',
    'pricing_authority_state',
    'price_adjustment_reason',
  ]) {
    assert.match(migration, new RegExp(column), `${column} must remain explicit in quote-line pricing provenance`)
  }

  for (const view of [
    'commercial_line_pricing_v',
    'engagement_scope_price_coverage_v',
    'engagement_pricing_position_v',
  ]) {
    assert.match(migration, new RegExp(`create or replace view public\\.${view}[\\s\\S]*security_invoker\\s*=\\s*true`, 'i'))
  }

  assert.match(migration, /NEEDS_PRICE_DECISION/)
  assert.match(migration, /DRAFT_PRICE_AVAILABLE/)
  assert.match(migration, /PRICE_WITH_PARTIAL_COST/)
  assert.match(migration, /projected_contribution/)
  assert.match(migration, /ep\.estimate_coverage_state = 'COST_SCOPE_REPRESENTED'/)

  assert.match(runtime, /export async function createDraftQuote\b/)
  assert.match(runtime, /export async function addManualQuoteLine\b/)
  assert.match(runtime, /export async function addQuoteLineFromPriceRule\b/)
  assert.match(runtime, /export async function setQuoteLinePrice\b/)
  assert.match(runtime, /Explicitly allow the draft candidate or approve it before applying it/)
  assert.match(runtime, /A reason is required when the proposed customer price differs from the Price Book basis/)
  assert.match(runtime, /pricing_rule_status_at_application/)
  assert.match(runtime, /policy_total_snapshot/)
})

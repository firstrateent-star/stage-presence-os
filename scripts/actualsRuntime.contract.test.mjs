import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

test('actuals runtime preserves plan truth and separates operational actuals from economic actuals', () => {
  const migration = read('supabase/migrations/20260913014500_actuals_runtime_v1.sql')
  const runtime = read('src/lib/actualsRuntime.ts')

  assert.match(migration, /create table public\.engagement_labor_actuals/i)
  assert.match(migration, /planned_cost_item_id uuid references public\.engagement_cost_items/i)
  assert.match(migration, /labor_actual_id uuid references public\.engagement_labor_actuals/i)
  assert.match(migration, /resource_usage_id uuid references public\.resource_usage/i)
  assert.match(migration, /Plan cost rows cannot be converted into ACTUAL rows/i)

  for (const view of [
    'engagement_labor_actuals_v',
    'engagement_resource_actuals_v',
    'engagement_actual_cost_line_variance_v',
    'engagement_cost_variance_v',
    'engagement_actuals_position_v',
  ]) {
    assert.match(migration, new RegExp(`create or replace view public\\.${view}[\\s\\S]*security_invoker\\s*=\\s*true`, 'i'))
  }

  for (const state of [
    'LABOR_ACTUALS_NEEDED',
    'RESOURCE_USAGE_NEEDED',
    'ACTUAL_COSTS_INCOMPLETE',
    'WAREHOUSE_RETURN_OPEN',
    'CLOSEOUT_NEEDED',
    'ACTUALS_BASELINE_COMPLETE',
  ]) assert.match(migration, new RegExp(state))

  assert.match(runtime, /export async function recordLaborActual\b/)
  assert.match(runtime, /export async function completeAssignmentFromActuals\b/)
  assert.match(runtime, /export async function recordResourceUsageFromCommitment\b/)
  assert.match(runtime, /export async function recordActualCost\b/)
  assert.match(runtime, /export async function recordLaborActualCostFromApprovedRate\b/)
  assert.match(runtime, /Only an APPROVED Cost Book rate can calculate actual labor cost/)
  assert.match(runtime, /Actual Resource quantity exceeds the committed quantity/)
})

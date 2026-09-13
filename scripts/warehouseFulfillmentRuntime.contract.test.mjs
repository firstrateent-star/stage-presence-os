import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

test('warehouse fulfillment runtime separates current custody state from actual resource usage', () => {
  const migration = read('supabase/migrations/20260913010500_warehouse_fulfillment_runtime_v1.sql')
  const runtime = read('src/lib/warehouseFulfillmentRuntime.ts')

  for (const token of ['AWAITING_PULL','PULLED','LOADED','OUT','RETURNED','INSPECTION_REQUIRED','INSPECTED','RESTOCKED','EXCEPTION']) {
    assert.match(migration, new RegExp(token), `${token} must remain an explicit fulfillment state`)
  }
  assert.match(migration, /resource_commitment_id uuid not null unique/)
  assert.match(migration, /warehouse_fulfillment_queue_v/)
  assert.match(migration, /engagement_warehouse_position_v/)
  assert.match(runtime, /initializeWarehouseFulfillment/)
  assert.match(runtime, /transitionWarehouseFulfillment/)
  assert.match(runtime, /RESOURCE_FULFILLMENT_STATE_CHANGED/)
  assert.doesNotMatch(runtime, /from\('resource_usage'\).*insert/s, 'warehouse movement must not silently become actual usage')
})

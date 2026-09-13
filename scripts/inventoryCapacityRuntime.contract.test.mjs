import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration = fs.readFileSync(new URL('../supabase/migrations/20260913044500_inventory_capacity_runtime_v1.sql', import.meta.url), 'utf8')
const runtime = fs.readFileSync(new URL('../src/lib/inventoryCapacityRuntime.ts', import.meta.url), 'utf8')
const operations = fs.readFileSync(new URL('../src/lib/operationsCommands.ts', import.meta.url), 'utf8')

test('inventory verification preserves total and serviceable quantity separately', () => {
  assert.match(migration, /verified_quantity numeric not null/)
  assert.match(migration, /serviceable_quantity numeric not null/)
  assert.match(migration, /serviceable_quantity <= verified_quantity/)
  assert.match(migration, /resource_inventory_current_v/)
})

test('capacity derives from verified serviceable inventory and confirmed commitments', () => {
  assert.match(migration, /resource_capacity_position_v/)
  assert.match(migration, /committed_quantity_today/)
  assert.match(migration, /serviceable_quantity-coalesce/)
  assert.match(runtime, /capacityForWindow/)
  assert.match(runtime, /serviceableQuantity - committedQuantity/)
})

test('inventory verification promotes headline quantity only after explicit verification', () => {
  assert.match(runtime, /verifyInventory/)
  assert.match(runtime, /quantity_state: 'VERIFIED'/)
  assert.match(runtime, /RESOURCE_INVENTORY_VERIFIED/)
})

test('operations confirmation uses verified serviceable capacity', () => {
  assert.match(operations, /confirmReservationAgainstVerifiedCapacity/)
  assert.doesNotMatch(operations, /confirmResourceReservation/)
  assert.match(runtime, /Owned capacity is not physically verified/)
})

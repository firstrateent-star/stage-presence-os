import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime = fs.readFileSync(new URL('../src/lib/inventoryCapacityRuntime.ts', import.meta.url), 'utf8')
const panel = fs.readFileSync(new URL('../src/components/WarehouseVerificationPanel.tsx', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

test('warehouse verification surface writes only through inventory capacity runtime', () => {
  assert.doesNotMatch(panel, /\.from\(/)
  assert.doesNotMatch(panel, /\.insert\(/)
  assert.doesNotMatch(panel, /\.update\(/)
  assert.match(panel, /verifyInventory/)
  assert.match(panel, /listCapacityPositions/)
  assert.match(panel, /listInventoryLocations/)
})

test('verification keeps physical total distinct from serviceable capacity', () => {
  assert.match(panel, /Physically counted/)
  assert.match(panel, /Serviceable now/)
  assert.match(panel, /Unavailable after count/)
  assert.match(runtime, /serviceableQuantity > input\.verifiedQuantity/)
  assert.match(runtime, /quantity_state: 'VERIFIED'/)
})

test('inventory verification only offers storage-context locations', () => {
  assert.match(runtime, /'WAREHOUSE'/)
  assert.match(runtime, /'OFFICE'/)
  assert.match(runtime, /'OTHER'/)
  assert.doesNotMatch(runtime, /\['VENUE'/)
})

test('high-value warehouse sweep is prioritized without hiding the long tail', () => {
  for (const name of ['17x10 LED Trailer', '12x7 LED Trailer', '10x5 LED Trailer', '3.9mm LED Panels', 'LED Poster Panels']) {
    assert.match(panel, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(panel, /ordered\.map/)
})

test('resources screen separates warehouse truth from capability catalog', () => {
  const rendered = app.slice(app.indexOf("screen === 'resources'"), app.indexOf("screen === 'economy'"))
  assert.match(rendered, /WarehouseVerificationPanel/)
  assert.match(rendered, /CapabilityV2/)
  assert.ok(rendered.indexOf('<WarehouseVerificationPanel') < rendered.indexOf('<CapabilityV2'))
})

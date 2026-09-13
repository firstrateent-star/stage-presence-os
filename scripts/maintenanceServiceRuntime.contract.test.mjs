import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration = fs.readFileSync(new URL('../supabase/migrations/20260913051500_maintenance_service_runtime_v1.sql', import.meta.url), 'utf8')
const runtime = fs.readFileSync(new URL('../src/lib/maintenanceServiceRuntime.ts', import.meta.url), 'utf8')
const panel = fs.readFileSync(new URL('../src/components/MaintenanceServicePanel.tsx', import.meta.url), 'utf8')

test('maintenance owns condition workflow while company cost ledger owns repair economics', () => {
  assert.match(migration, /create table if not exists public\.resource_maintenance_issues/)
  assert.match(migration, /maintenance_issue_id uuid references public\.resource_maintenance_issues/)
  assert.match(runtime, /company_cost_items/)
  assert.match(runtime, /cost_category: 'MAINTENANCE'/)
})

test('service issues alter capacity through inventory verification evidence', () => {
  assert.match(runtime, /verifyInventory/)
  assert.match(runtime, /serviceableQuantity: currentServiceable - input\.affectedQuantity/)
  assert.match(runtime, /Returned to service/)
  assert.match(runtime, /Math\.min/)
})

test('maintenance surface writes only through runtime commands', () => {
  assert.doesNotMatch(panel, /\.from\(/)
  assert.doesNotMatch(panel, /\.insert\(/)
  assert.doesNotMatch(panel, /\.update\(/)
  assert.match(panel, /openMaintenanceIssue/)
  assert.match(panel, /recordMaintenanceCost/)
  assert.match(panel, /resolveMaintenanceIssue/)
})

test('maintenance keeps estimate and actual repair money distinct', () => {
  assert.match(panel, /state:'ESTIMATE'/)
  assert.match(panel, /state:'ACTUAL'/)
  assert.match(migration, /estimated_cost/)
  assert.match(migration, /actual_cost/)
})

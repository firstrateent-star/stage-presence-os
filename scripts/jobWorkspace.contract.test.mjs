import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const workspace = fs.readFileSync(new URL('../src/lib/jobWorkspace.ts', import.meta.url), 'utf8')
const panel = fs.readFileSync(new URL('../src/components/JobWorkspacePanel.tsx', import.meta.url), 'utf8')
const actuals = fs.readFileSync(new URL('../src/components/ActualsRuntimePanel.tsx', import.meta.url), 'utf8')
const delivery = fs.readFileSync(new URL('../src/components/DeliveryActualsPanel.tsx', import.meta.url), 'utf8')
const bridge = fs.readFileSync(new URL('../src/components/EconomicActualsBridgePanel.tsx', import.meta.url), 'utf8')

test('Job Workspace composes canonical runtime read contracts', () => {
  for (const contract of [
    'engagement_workspace_v',
    'engagement_estimate_position_v',
    'engagement_pricing_position_v',
    'engagement_commitment_bridge_v',
    'engagement_warehouse_position_v',
    'engagement_economics_v',
  ]) assert.match(workspace, new RegExp(contract))
  assert.match(workspace, /getActualsPosition/)
  assert.match(workspace, /listLaborActuals/)
  assert.match(workspace, /listResourceActuals/)
  assert.match(workspace, /listCostVariance/)
})

test('workspace presents lifecycle and derived attention without owning canonical writes', () => {
  for (const stage of ['SCOPE','ESTIMATE','PRICE','COMMIT','OPERATE','WAREHOUSE','ACTUALS','MONEY','CLOSEOUT']) assert.match(workspace, new RegExp(stage))
  assert.match(panel, /WHAT NEEDS ATTENTION NOW/)
  assert.doesNotMatch(workspace, /\.insert\(/)
  assert.doesNotMatch(workspace, /\.update\(/)
})

test('Actuals surface writes only through Actuals Runtime commands', () => {
  assert.match(actuals, /recordLaborActual/)
  assert.match(actuals, /recordResourceUsageFromCommitment/)
  assert.match(actuals, /recordActualCost/)
  assert.match(actuals, /completeAssignmentFromActuals/)
})

test('legacy delivery and economic actuals surfaces no longer compete with Actuals Runtime', () => {
  assert.match(delivery, /ActualsRuntimePanel/)
  assert.match(bridge, /return null/)
})

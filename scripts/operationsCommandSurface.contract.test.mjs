import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const commands = fs.readFileSync(new URL('../src/lib/operationsCommands.ts', import.meta.url), 'utf8')
const context = fs.readFileSync(new URL('../src/lib/operationsCommandContext.ts', import.meta.url), 'utf8')
const panel = fs.readFileSync(new URL('../src/components/OperationsCommandPanel.tsx', import.meta.url), 'utf8')
const movement = fs.readFileSync(new URL('../src/components/MovementFocusPanel.tsx', import.meta.url), 'utf8')

test('operations command surface uses canonical domain runtimes', () => {
  assert.match(commands, /applyRequirementWindowCandidate/)
  assert.match(commands, /confirmReservationAgainstVerifiedCapacity/)
  assert.match(commands, /createCrewAssignment/)
  assert.match(commands, /createPaymentScheduleTerm/)
  assert.match(commands, /initializeWarehouseFulfillment/)
  assert.match(commands, /transitionWarehouseFulfillment/)
})

test('quick reservation confirmation routes through verified capacity authority', () => {
  assert.match(commands, /confirmReservationAgainstVerifiedCapacity/)
  assert.doesNotMatch(commands, /allowUnverifiedCapacity/)
  assert.doesNotMatch(commands, /allowCapacityConflict/)
})

test('command UI does not own canonical writes', () => {
  assert.doesNotMatch(panel, /\.from\(/)
  assert.doesNotMatch(panel, /\.insert\(/)
  assert.doesNotMatch(panel, /\.update\(/)
  assert.match(panel, /createTentativeHoldFromRequirement/)
  assert.match(panel, /confirmCrewAssignment/)
  assert.match(panel, /setScheduleItemTiming/)
  assert.match(panel, /startWarehouseCycle/)
  assert.match(panel, /advanceWarehouseState/)
  assert.match(panel, /addPaymentTerm/)
})

test('command context is read-only and composes operating domains', () => {
  assert.doesNotMatch(context, /\.insert\(/)
  assert.doesNotMatch(context, /\.update\(/)
  assert.match(context, /listResourceRequirements/)
  assert.match(context, /listWarehouseQueue/)
  assert.match(context, /engagement_assignments/)
  assert.match(context, /engagement_schedule_items/)
})

test('job movement surface renders workspace then commands before deeper signals', () => {
  const workspaceRender = movement.indexOf('<JobWorkspacePanel')
  const commandsRender = movement.indexOf('<OperationsCommandPanel')
  const readinessRender = movement.indexOf('<DeliveryReadinessPanel')
  assert.ok(workspaceRender >= 0)
  assert.ok(commandsRender > workspaceRender)
  assert.ok(readinessRender > commandsRender)
})

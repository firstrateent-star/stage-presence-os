import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../supabase/functions/stage-presence-mcp/index.ts', import.meta.url), 'utf8')

const readTools = [
  'find_contact',
  'find_engagement',
  'get_pricing',
  'generate_lead_summary',
  'generate_job_sheet',
  'search_stage_presence',
  'get_attention_items',
  'get_upcoming_engagements',
]

const writeTools = ['set_next_action', 'complete_next_action', 'update_next_action']

test('every expected tool is registered exactly once', () => {
  for (const name of [...readTools, ...writeTools]) {
    const matches = source.match(new RegExp(`server\\.registerTool\\('${name}'`, 'g')) ?? []
    assert.equal(matches.length, 1, `expected exactly one registration of ${name}, found ${matches.length}`)
  }
})

test('exactly 11 tools are registered — no silent extra or missing tool', () => {
  const matches = source.match(/server\.registerTool\('[a-z_]+'/g) ?? []
  assert.equal(matches.length, 11, `expected 11 registerTool calls, found ${matches.length}`)
})

test('read tools are marked readOnlyHint: true', () => {
  for (const name of readTools) {
    const start = source.indexOf(`server.registerTool('${name}'`)
    const block = source.slice(start, start + 800)
    assert.match(block, /annotations: \{ readOnlyHint: true \}/, `${name} must declare readOnlyHint: true`)
  }
})

test('write tools declare non-destructive, idempotent, non-readonly annotations', () => {
  for (const name of writeTools) {
    const start = source.indexOf(`server.registerTool('${name}'`)
    const block = source.slice(start, start + 1600)
    assert.match(block, /annotations: \{ readOnlyHint: false, destructiveHint: false, idempotentHint: true \}/, `${name} must declare write annotations`)
  }
})

test('write tools require confirmed literally true and a non-optional idempotencyKey', () => {
  for (const name of writeTools) {
    const start = source.indexOf(`server.registerTool('${name}'`)
    const block = source.slice(start, start + 1600)
    assert.match(block, /confirmed: z\.literal\(true\)/, `${name} schema must require confirmed: z.literal(true)`)
    assert.match(block, /idempotencyKey: z\.string\(\)/, `${name} schema must require idempotencyKey`)
    assert.doesNotMatch(block.split('idempotencyKey:')[1]?.split('\n')[0] ?? '', /optional\(\)/, `${name}'s idempotencyKey must not be optional`)
  }
})

test('every write handler refuses when confirmed is not literally true', () => {
  for (const fn of ['setNextAction', 'completeNextAction', 'updateNextAction']) {
    const start = source.indexOf(`async function ${fn}(`)
    assert.ok(start >= 0, `could not find ${fn} implementation`)
    const block = source.slice(start, start + 800)
    assert.match(block, /args\.confirmed !== true/, `${fn} must guard on confirmed !== true`)
  }
})

test('no service-role key, no raw SQL, anywhere in this function', () => {
  assert.doesNotMatch(source, /SERVICE_ROLE/)
  assert.doesNotMatch(source, /\.rpc\(/)
  assert.doesNotMatch(source, /execute_sql/)
  assert.match(source, /withSupabase\(\{ auth: 'user' \}\)/)
})

test('complete_next_action only transitions OPEN/WAITING/BLOCKED -> DONE and never touches another row', () => {
  const block = source.slice(source.indexOf('async function completeNextAction('), source.indexOf('async function rereadCompletedWorkItem('))
  assert.match(block, /OPEN_WORK_ITEM_STATUSES\.includes\(current\.status\)/)
  assert.match(block, /status: 'DONE'/)
  assert.match(block, /completed_at: new Date\(\)\.toISOString\(\)/)
  // the mutating .update(...) call must be scoped by workItemId and nothing else
  const updateCallStart = block.indexOf(".from('work_items')\n    .update(")
  assert.ok(updateCallStart >= 0, 'expected a scoped work_items update call')
  const updateCall = block.slice(updateCallStart, updateCallStart + 400)
  assert.match(updateCall, /\.eq\('id', args\.workItemId\)/)
  assert.doesNotMatch(updateCall, /\.eq\('engagement_id'/, 'must not filter/touch by engagement_id — only the named row')
})

test('complete_next_action rejects completing an already-DONE item under a different idempotency key', () => {
  const block = source.slice(source.indexOf('async function completeNextAction('), source.indexOf('async function rereadCompletedWorkItem('))
  assert.match(block, /completed by a different request/)
})

test('update_next_action refuses to edit a DONE or CANCELLED item', () => {
  const block = source.slice(source.indexOf('async function updateNextAction('), source.indexOf('async function rereadUpdatedWorkItem('))
  assert.match(block, /current\.status === 'DONE' \|\| current\.status === 'CANCELLED'/)
})

test('update_next_action only patches explicitly supplied fields', () => {
  const block = source.slice(source.indexOf('async function updateNextAction('), source.indexOf('async function rereadUpdatedWorkItem('))
  assert.match(block, /requestedEntries\.length === 0/, 'must refuse a no-op update with nothing supplied')
  assert.match(block, /UPDATE_NEXT_ACTION_FIELD_MAP/)
})

test('update_next_action rejects idempotency-key reuse with a different payload', () => {
  const block = source.slice(source.indexOf('async function updateNextAction('), source.indexOf('async function rereadUpdatedWorkItem('))
  assert.match(block, /already used for a different update payload/)
})

test('set_next_action rejects idempotency-key reuse with a different payload', () => {
  const start = source.indexOf('async function setNextAction(')
  const block = source.slice(start, start + 4000)
  assert.match(block, /already used for a different proposed change/)
})

test('all three write tools perform a canonical re-read before reporting VERIFIED_SAVED', () => {
  for (const fn of ['setNextAction', 'rereadCompletedWorkItem', 'rereadUpdatedWorkItem']) {
    const start = source.indexOf(`async function ${fn}(`)
    assert.ok(start >= 0, `could not find ${fn}`)
  }
  const verifiedCount = (source.match(/VERIFIED_SAVED/g) ?? []).length
  const canonicalRereadComments = (source.match(/Canonical re-read: never trust the write/g) ?? []).length
  assert.ok(verifiedCount >= 3, 'expected VERIFIED_SAVED to appear for each write capability')
  assert.equal(canonicalRereadComments, 3, 'expected an explicit canonical-re-read step for each of the 3 write tools')
})

test('server manifest version was bumped for the new tool set', () => {
  assert.match(source, /new McpServer\(\{ name: 'stage-presence', version: '1\.1\.0' \}\)/)
})

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
  'build_quote_draft',
]

const writeTools = ['set_next_action', 'complete_next_action', 'update_next_action', 'create_lead', 'save_quote_draft']

test('every expected tool is registered exactly once', () => {
  for (const name of [...readTools, ...writeTools]) {
    const matches = source.match(new RegExp(`server\\.registerTool\\('${name}'`, 'g')) ?? []
    assert.equal(matches.length, 1, `expected exactly one registration of ${name}, found ${matches.length}`)
  }
})

test('exactly 14 tools are registered — no silent extra or missing tool', () => {
  const matches = source.match(/server\.registerTool\('[a-z_]+'/g) ?? []
  assert.equal(matches.length, 14, `expected 14 registerTool calls, found ${matches.length}`)
})

test('read tools are marked readOnlyHint: true', () => {
  for (const name of readTools) {
    const start = source.indexOf(`server.registerTool('${name}'`)
    const block = source.slice(start, start + 1200)
    assert.match(block, /annotations: \{ readOnlyHint: true \}/, `${name} must declare readOnlyHint: true`)
  }
})

test('write tools declare non-destructive, idempotent, non-readonly annotations', () => {
  for (const name of writeTools) {
    const start = source.indexOf(`server.registerTool('${name}'`)
    const block = source.slice(start, start + 3600)
    assert.match(block, /annotations: \{ readOnlyHint: false, destructiveHint: false, idempotentHint: true \}/, `${name} must declare write annotations`)
  }
})

test('write tools require confirmed literally true and a non-optional idempotencyKey', () => {
  for (const name of writeTools) {
    const start = source.indexOf(`server.registerTool('${name}'`)
    const block = source.slice(start, start + 3600)
    assert.match(block, /confirmed: z\.literal\(true\)/, `${name} schema must require confirmed: z.literal(true)`)
    assert.match(block, /idempotencyKey: z\.string\(\)/, `${name} schema must require idempotencyKey`)
    assert.doesNotMatch(block.split('idempotencyKey:')[1]?.split('\n')[0] ?? '', /optional\(\)/, `${name}'s idempotencyKey must not be optional`)
  }
})

test('every write handler refuses when confirmed is not literally true', () => {
  for (const fn of ['setNextAction', 'completeNextAction', 'updateNextAction', 'createLead', 'saveQuoteDraft']) {
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

test('all five write tools perform a canonical re-read before reporting VERIFIED_SAVED', () => {
  for (const fn of ['setNextAction', 'rereadCompletedWorkItem', 'rereadUpdatedWorkItem', 'rereadCreatedLead', 'rereadSavedQuote']) {
    const start = source.indexOf(`async function ${fn}(`)
    assert.ok(start >= 0, `could not find ${fn}`)
  }
  const verifiedCount = (source.match(/VERIFIED_SAVED/g) ?? []).length
  const canonicalRereadComments = (source.match(/Canonical re-read: never trust the write/g) ?? []).length
  assert.ok(verifiedCount >= 5, 'expected VERIFIED_SAVED to appear for each write capability')
  assert.equal(canonicalRereadComments, 5, 'expected an explicit canonical-re-read step for each of the 5 write tools')
})

test('save_quote_draft never promotes a DRAFT_CANDIDATE Price Book rate to approved policy', () => {
  const start = source.indexOf('async function saveQuoteDraft(')
  const end = source.indexOf('async function rereadSavedQuote(')
  const block = source.slice(start, end)
  assert.doesNotMatch(block, /status:\s*'APPROVED'/)
  assert.match(block, /pricing_rules/)
  assert.match(block, /authorityState = rule\.status === 'APPROVED' \? 'APPROVED_AUTHORITY' : 'DRAFT_CANDIDATE'/)
})

test('save_quote_draft refuses a DRAFT Price Book rule unless allowDraft is explicitly set', () => {
  const start = source.indexOf('async function saveQuoteDraft(')
  const end = source.indexOf('async function rereadSavedQuote(')
  const block = source.slice(start, end)
  assert.match(block, /rule\.status === 'DRAFT' && !line\.allowDraft/)
})

test('save_quote_draft requires a reason when the proposed price differs from the Price Book rate', () => {
  const start = source.indexOf('async function saveQuoteDraft(')
  const end = source.indexOf('async function rereadSavedQuote(')
  const block = source.slice(start, end)
  assert.match(block, /differsFromPolicy && !line\.priceAdjustmentReason/)
})

test('save_quote_draft validates every line before writing anything (no partial quotes)', () => {
  const start = source.indexOf('async function saveQuoteDraft(')
  const end = source.indexOf('async function rereadSavedQuote(')
  const block = source.slice(start, end)
  const validationLoopIndex = block.indexOf('for (const [index, line] of args.lines.entries())')
  const insertIndex = block.indexOf(".from('commercial_documents')\n    .insert(")
  assert.ok(validationLoopIndex >= 0, 'expected a validation pass over every line')
  assert.ok(insertIndex > validationLoopIndex, 'the quote document insert must happen after all lines are validated')
})

test('save_quote_draft respects the one-current-DRAFT-quote-per-engagement rule instead of creating a duplicate', () => {
  const start = source.indexOf('async function saveQuoteDraft(')
  const end = source.indexOf('async function rereadSavedQuote(')
  const block = source.slice(start, end)
  assert.match(block, /already has a current DRAFT quote/)
})

test('build_quote_draft never writes — it only reads', () => {
  const start = source.indexOf('async function buildQuoteDraft(')
  const end = source.indexOf('/* ============================== save_quote_draft')
  const block = source.slice(start, end)
  assert.doesNotMatch(block, /\.insert\(/)
  assert.doesNotMatch(block, /\.update\(/)
  assert.match(block, /proposalOnly: true/)
})

test('create_lead never auto-merges an ambiguous contact or venue match', () => {
  const block = source.slice(source.indexOf('async function matchOrCreateContactParty('), source.indexOf('async function createLead('))
  assert.match(block, /AMBIGUOUS_NOT_LINKED/)
  assert.match(block, /\(matches \?\? \[\]\)\.length > 1/)
})

test('create_lead records ambiguous matches as CONFLICTING engagement_facts instead of guessing', () => {
  const start = source.indexOf('async function createLead(')
  const end = source.indexOf('async function rereadCreatedLead(')
  const block = source.slice(start, end)
  assert.match(block, /category: 'CUSTOMER'/)
  assert.match(block, /category: 'VENUE'/)
  assert.match(block, /certainty_state: 'CONFLICTING'/)
})

test('create_lead does not invent a separate leads table — it writes engagements', () => {
  const start = source.indexOf('async function createLead(')
  const end = source.indexOf('async function rereadCreatedLead(')
  const block = source.slice(start, end)
  assert.match(block, /\.from\('engagements'\)\s*\n\s*\.insert/)
  assert.doesNotMatch(source, /\.from\('leads'\)/)
})

test('create_lead is idempotent via engagements.source_key and refuses a changed payload under the same key', () => {
  const start = source.indexOf('async function createLead(')
  const end = source.indexOf('async function rereadCreatedLead(')
  const block = source.slice(start, end)
  assert.match(block, /source_key: sourceKey/)
  assert.match(block, /already used for a different lead proposal/)
})

test('create_lead does not silently promote a lead\'s default commercial/commitment state', () => {
  const start = source.indexOf('async function createLead(')
  const end = source.indexOf('async function rereadCreatedLead(')
  const block = source.slice(start, end)
  assert.doesNotMatch(block, /commercial_state:/)
  assert.doesNotMatch(block, /commitment_state:/)
})

test('server manifest version was bumped for the new tool set', () => {
  assert.match(source, /new McpServer\(\{ name: 'stage-presence', version: '1\.3\.0' \}\)/)
})

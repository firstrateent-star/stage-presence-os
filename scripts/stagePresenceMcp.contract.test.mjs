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
  'find_team_member',
  'find_resource',
  'get_capabilities',
  'generate_email',
]

const writeTools = [
  'set_next_action', 'complete_next_action', 'update_next_action', 'create_lead',
  'save_quote_draft', 'assign_team_member', 'add_resource_requirement',
]

test('every expected tool is registered exactly once', () => {
  for (const name of [...readTools, ...writeTools]) {
    const matches = source.match(new RegExp(`server\\.registerTool\\('${name}'`, 'g')) ?? []
    assert.equal(matches.length, 1, `expected exactly one registration of ${name}, found ${matches.length}`)
  }
})

test('exactly 20 tools are registered — no silent extra or missing tool', () => {
  const matches = source.match(/server\.registerTool\('[a-z_]+'/g) ?? []
  assert.equal(matches.length, 20, `expected 20 registerTool calls, found ${matches.length}`)
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
  for (const fn of ['setNextAction', 'completeNextAction', 'updateNextAction', 'createLead', 'saveQuoteDraft', 'assignTeamMember', 'addResourceRequirement']) {
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

test('all seven write tools perform a canonical re-read before reporting VERIFIED_SAVED', () => {
  for (const fn of ['setNextAction', 'rereadCompletedWorkItem', 'rereadUpdatedWorkItem', 'rereadCreatedLead', 'rereadSavedQuote', 'rereadResourceRequirement', 'assignTeamMember']) {
    const start = source.indexOf(`async function ${fn}(`)
    assert.ok(start >= 0, `could not find ${fn}`)
  }
  const verifiedCount = (source.match(/VERIFIED_SAVED/g) ?? []).length
  const canonicalRereadComments = (source.match(/Canonical re-read: never trust the write/g) ?? []).length
  assert.ok(verifiedCount >= 7, 'expected VERIFIED_SAVED to appear for each write capability')
  assert.equal(canonicalRereadComments, 7, 'expected an explicit canonical-re-read step for each of the 7 write tools')
})

test('assign_team_member only permits POSSIBLE or REQUESTED — never CONFIRMED/DECLINED/COMPLETED/UNKNOWN', () => {
  assert.match(source, /const ASSIGNABLE_STATES = \['POSSIBLE', 'REQUESTED'\] as const/)
  const start = source.indexOf('async function assignTeamMember(')
  const end = source.indexOf('/* ============================== add_resource_requirement')
  const block = source.slice(start, end)
  assert.doesNotMatch(block, /assignment_state: 'CONFIRMED'/)
})

test('assign_team_member never claims availability is proven', () => {
  const start = source.indexOf('async function assignTeamMember(')
  const end = source.indexOf('/* ============================== add_resource_requirement')
  const block = source.slice(start, end)
  assert.match(block, /does not prove or confirm actual crew availability/)
})

test('assign_team_member rejects idempotency-key reuse with a different payload', () => {
  const start = source.indexOf('async function assignTeamMember(')
  const end = source.indexOf('/* ============================== add_resource_requirement')
  const block = source.slice(start, end)
  assert.match(block, /already used for a different proposed assignment/)
})

test('add_resource_requirement never writes to resource_commitments (no hold/reservation)', () => {
  const start = source.indexOf('async function addResourceRequirement(')
  const end = source.indexOf('/* ============================== generate_email')
  const block = source.slice(start, end)
  assert.doesNotMatch(block, /\.from\('resource_commitments'\)/)
  assert.match(block, /\.from\('engagement_resources'\)/)
})

test('add_resource_requirement never claims availability', () => {
  const start = source.indexOf('async function rereadResourceRequirement(')
  const block = source.slice(start, start + 1800)
  assert.match(block, /does not mean this resource is available, held, or reserved/)
})

test('generate_job_sheet never presents non-CONFIRMED crew as confirmed and separates requirements from commitments', () => {
  const start = source.indexOf('async function generateJobSheet(')
  const end = source.indexOf('async function getAttentionItems(') > start ? source.indexOf('async function getAttentionItems(') : source.length
  const block = source.slice(start, start + 6000)
  assert.match(block, /confirmed: a\.assignment_state === 'CONFIRMED'/)
  assert.match(block, /NOT CONFIRMED — proposal only/)
  assert.match(block, /reservedInventory: false/)
  assert.match(block, /resource_commitments/)
})

test('generate_email is draft-only and never sends or changes engagement state', () => {
  const start = source.indexOf('async function generateEmail(')
  const end = source.indexOf('/* ============================== get_capabilities')
  const block = source.slice(start, end)
  assert.match(block, /draftOnly: true/)
  assert.match(block, /sent: false/)
  assert.doesNotMatch(block, /\.insert\(/)
  assert.doesNotMatch(block, /\.update\(/)
  assert.doesNotMatch(block, /commercial_state:/)
})

test('get_capabilities never advertises send_email, confirmed availability, holds, or pricing-authority changes as implemented', () => {
  const start = source.indexOf('const CAPABILITY_TRUTH')
  const end = source.indexOf('async function getCapabilities(')
  const block = source.slice(start, end)
  assert.match(block, /name: 'send_email', category: 'NOT_IMPLEMENTED'/)
  assert.match(block, /name: 'confirm_crew_availability', category: 'FRONTIER'/)
  assert.match(block, /name: 'create_resource_hold_or_reservation', category: 'FRONTIER'/)
  assert.match(block, /name: 'approve_or_change_pricing_authority', category: 'FRONTIER'/)
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
  assert.match(source, /new McpServer\(\{ name: 'stage-presence', version: '1\.4\.0' \}\)/)
})

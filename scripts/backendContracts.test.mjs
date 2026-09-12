import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

function filesUnder(dir) {
  const base = join(root, dir)
  const out = []
  for (const entry of readdirSync(base)) {
    const full = join(base, entry)
    if (statSync(full).isDirectory()) out.push(...filesUnder(relative(root, full)))
    else out.push(relative(root, full))
  }
  return out
}

test('canonical movement and venue writes are routed out of engagement compatibility fields', () => {
  const repository = read('src/lib/repository.ts')
  assert.match(repository, /venue_name:\s*submittedVenueName/)
  assert.match(repository, /next_action:\s*submittedNextAction/)
  assert.match(repository, /waiting_on:\s*submittedWaitingOn/)
  assert.match(repository, /blocked_reason:\s*submittedBlockedReason/)
  assert.match(repository, /await linkCanonicalVenue\(/)
  assert.match(repository, /await saveCanonicalNextMove\(/)

  const rootPatchBlock = repository.match(/const \{[\s\S]*?\.\.\.canonicalRootPatch[\s\S]*?\} = patch/)?.[0] ?? ''
  for (const field of ['venue_name', 'next_action', 'next_action_at', 'waiting_on', 'blocked_reason']) {
    assert.match(rootPatchBlock, new RegExp(`${field}:`), `${field} must be stripped before engagements update`)
  }
})

test('no component writes canonical backend tables directly', () => {
  const componentFiles = [...filesUnder('src/components'), ...filesUnder('src/screens')]
    .filter((file) => /\.(ts|tsx)$/.test(file))
  const directMutation = /\.from\(['"][^'"]+['"]\)\s*\.(insert|update|upsert|delete)\b/g
  const offenders = []
  for (const file of componentFiles) {
    const source = read(file)
    if (directMutation.test(source)) offenders.push(file)
    directMutation.lastIndex = 0
  }
  assert.deepEqual(offenders, [], `UI must call repository/command contracts, not mutate Supabase directly: ${offenders.join(', ')}`)
})

test('stable frontend read-contract migrations exist and use security_invoker', () => {
  const migration = read('supabase/migrations/20260912190000_stable_frontend_read_contracts_v1.sql')
  assert.match(migration, /create or replace view public\.engagement_summary_v[\s\S]*security_invoker\s*=\s*true/i)
  assert.match(migration, /create or replace view public\.capability_summary_v[\s\S]*security_invoker\s*=\s*true/i)
  assert.match(migration, /COMPATIBILITY_FALLBACK/)
  assert.match(migration, /next_work/)
})

test('backend constitution migration removes obsolete duplicate-context constraints and provides role helper', () => {
  const migration = read('supabase/migrations/20260912185000_backend_constitution_v1.sql')
  assert.match(migration, /drop constraint if exists waiting_requires_context/i)
  assert.match(migration, /blocked_requires_reason/i)
  assert.match(migration, /create or replace function private\.has_app_role/i)
  assert.match(migration, /Compatibility\/import field/)
})

test('approved policy state remains explicit in canonical policy models', () => {
  const migrationFiles = filesUnder('supabase/migrations').filter((file) => file.endsWith('.sql'))
  const corpus = migrationFiles.map(read).join('\n')
  assert.match(corpus, /economic_rate_profiles[\s\S]*DRAFT[\s\S]*APPROVED[\s\S]*RETIRED/i)
  assert.match(corpus, /pricing_rules[\s\S]*DRAFT[\s\S]*APPROVED[\s\S]*RETIRED/i)
})

test('typed application read contracts front the stable backend views', () => {
  const contracts = read('src/lib/readContracts.ts')
  for (const fn of [
    'listEngagementSummaries',
    'getEngagementSummary',
    'listCapabilities',
    'listRelationshipSummaries',
    'getEconomyOverview',
    'listRecoveryQueue',
  ]) {
    assert.match(contracts, new RegExp(`export async function ${fn}\\b`), `${fn} must remain a named application read contract`)
  }
  for (const view of [
    'engagement_summary_v',
    'capability_summary_v',
    'relationship_summary_v',
    'economy_overview_v',
    'recovery_queue_v',
  ]) {
    assert.match(contracts, new RegExp(`\\.from\\(['\"]${view}['\"]\\)`), `${view} must be consumed behind the read-contract layer`)
  }
})

test('frontend read contracts are authenticated SELECT-only surfaces', () => {
  const migration = read('supabase/migrations/20260912194000_read_contract_grants_v1.sql')
  for (const view of [
    'engagement_summary_v',
    'capability_summary_v',
    'relationship_summary_v',
    'economy_overview_v',
    'recovery_queue_v',
  ]) {
    assert.match(migration, new RegExp(`revoke all on public\\.${view} from anon, authenticated`, 'i'))
    assert.match(migration, new RegExp(`grant select on public\\.${view} to authenticated`, 'i'))
  }
})

test('capability semantics distinguish physical capacity from commercial and service concepts', () => {
  const migration = read('supabase/migrations/20260912191500_capability_kind_contract_v1.sql')
  assert.match(migration, /PHYSICAL_CAPACITY/)
  assert.match(migration, /SERVICE/)
  assert.match(migration, /LOGISTICS/)
  assert.match(migration, /COMMERCIAL_ADJUSTMENT/)
  assert.match(migration, /capacity_relevant/)
})

test('price and cost book foundation preserves governance and rental dimensionality', () => {
  const dimensions = read('supabase/migrations/20260912221500_price_book_dimensions_v1.sql')
  const seeds = read('supabase/migrations/20260912221600_price_cost_book_draft_seeds_v1.sql')
  const contracts = read('supabase/migrations/20260912221700_price_cost_book_read_contracts_v1.sql')

  for (const token of ['price_position', 'billing_basis', 'duration_value', 'duration_unit', 'role_code']) {
    assert.match(dimensions, new RegExp(token), `${token} must remain explicit in pricing policy`)
  }
  assert.match(seeds, /PER_UNIT[\s\S]*1, 'DAY'/i, 'per-unit per-day rental pricing must be representable')
  assert.match(contracts, /create or replace view public\.price_book_v[\s\S]*security_invoker\s*=\s*true/i)
  assert.match(contracts, /create or replace view public\.cost_book_v[\s\S]*security_invoker\s*=\s*true/i)
  assert.match(contracts, /create or replace view public\.engagement_estimate_position_v[\s\S]*security_invoker\s*=\s*true/i)
  assert.match(contracts, /DRAFT_CANDIDATE/)
  assert.match(contracts, /NO_RATE_EVIDENCE/)
  assert.match(contracts, /NO_COST_EVIDENCE/)
  assert.doesNotMatch(seeds, /'APPROVED'\s*,\s*'BASE_RATE'/i, 'evidence seeds must not silently become approved pricing authority')
})

test('estimate runtime reuses canonical cost items and makes missing cost decisions explicit', () => {
  const migration = read('supabase/migrations/20260912233000_estimate_runtime_v1.sql')
  const runtime = read('src/lib/estimateRuntime.ts')

  for (const view of ['engagement_estimate_lines_v', 'engagement_scope_cost_coverage_v', 'engagement_estimate_position_v']) {
    assert.match(migration, new RegExp(`create or replace view public\\.${view}[\\s\\S]*security_invoker\\s*=\\s*true`, 'i'))
  }
  assert.match(migration, /NEEDS_COST_DECISION/)
  assert.match(migration, /DRAFT_RATE_AVAILABLE/)
  assert.match(migration, /COSTING_NOT_STARTED/)
  assert.match(migration, /PARTIAL_COST_COVERAGE/)
  assert.match(runtime, /export async function createManualEstimate\b/)
  assert.match(runtime, /export async function createEstimateFromRateProfile\b/)
  assert.match(runtime, /export async function transitionCostItem\b/)
  assert.match(runtime, /Explicitly allow the draft rate or approve it before applying it/)
  assert.match(runtime, /rate_profile_status_at_application/)
  assert.match(runtime, /calculation_method/)
})

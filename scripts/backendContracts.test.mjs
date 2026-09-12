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

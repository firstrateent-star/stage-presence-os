import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

test('resource requirement runtime keeps candidate timing separate from committed truth', () => {
  const migration = read('supabase/migrations/20260913004500_resource_requirement_runtime_v1.sql')
  const runtime = read('src/lib/resourceRequirementRuntime.ts')
  assert.match(migration, /resource_requirement_position_v/)
  assert.match(migration, /engagement_resource_requirement_summary_v/)
  assert.match(migration, /SCHEDULE_EVIDENCE/)
  assert.match(migration, /EVENT_DATE_ONLY/)
  assert.match(migration, /WINDOW_CANDIDATE_AVAILABLE/)
  assert.match(migration, /READY_FOR_COMMITMENT_DECISION/)
  assert.match(runtime, /setResourceRequirementWindow/)
  assert.match(runtime, /applyRequirementWindowCandidate/)
  assert.match(runtime, /confirmCandidate/)
})

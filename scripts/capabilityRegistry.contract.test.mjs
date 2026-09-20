import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/lib/capabilityRegistry.ts', import.meta.url), 'utf8')

const expectedCapabilities = [
  'find_contact',
  'find_engagement',
  'create_lead',
  'update_lead',
  'set_next_action',
  'get_pricing',
  'build_quote_draft',
  'save_quote_draft',
  'create_job',
  'update_job',
  'add_resource_requirement',
  'assign_team_member',
  'generate_lead_summary',
  'generate_email',
  'generate_job_sheet',
  'search_stage_presence',
]

test('capability registry declares the full named surface', () => {
  for (const name of expectedCapabilities) {
    assert.match(source, new RegExp(`name: '${name}'`), `missing capability descriptor: ${name}`)
  }
})

test('every capability descriptor declares authority, review, and backing', () => {
  const descriptorBlocks = source.match(/\{\s*name: '[a-z_]+'[\s\S]*?\},/g) ?? []
  assert.equal(descriptorBlocks.length, expectedCapabilities.length)
  for (const block of descriptorBlocks) {
    assert.match(block, /authority: '(OBSERVE|SUGGEST|REVERSIBLE|CONSEQUENTIAL)'/, block)
    assert.match(block, /requiresHumanReview: (true|false)/, block)
    assert.match(block, /backing: '(CANONICAL_REUSE|REFRAMED_REUSE|NEW_READ_ONLY|NEW_WRITE_WRAPPER)'/, block)
  }
})

test('consequential capabilities always require human review', () => {
  const descriptorBlocks = source.match(/\{\s*name: '[a-z_]+'[\s\S]*?\},/g) ?? []
  for (const block of descriptorBlocks) {
    if (/authority: 'CONSEQUENTIAL'/.test(block)) {
      assert.match(block, /requiresHumanReview: true/, `CONSEQUENTIAL capability must require human review: ${block}`)
    }
  }
})

test('capability registry never free-writes SQL — writes route through canonical runtime functions', () => {
  assert.doesNotMatch(source, /\.update\(/)
  assert.match(source, /createEngagement/)
  assert.match(source, /updateEngagement/)
  assert.match(source, /saveCanonicalNextMove/)
  assert.match(source, /createDraftQuote/)
  assert.match(source, /addManualQuoteLine/)
  assert.match(source, /addQuoteLineFromPriceRule/)
  assert.match(source, /linkResource/)
  assert.match(source, /assignCrewFromCommand/)
})

test('generate_email never claims a send capability', () => {
  assert.doesNotMatch(source, /\bsendEmail\b/)
  assert.doesNotMatch(source, /\bsend\(/)
  assert.match(source, /does not send email automatically/)
})

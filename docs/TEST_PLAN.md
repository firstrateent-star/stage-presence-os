# First-Breath Test Plan

## Core acceptance scenario
A user can tell Stage Presence OS about a real opportunity and:
1. Create one canonical Engagement.
2. Preserve source/provenance.
3. Separate literal customer request from inferred outcome.
4. Show known facts.
5. Show material unknowns without falsely blocking work.
6. Link relevant parties.
7. Link provisional resources.
8. Set a next movement with owner/timing.
9. Surface the Engagement on Today when attention is required.
10. Preserve meaningful changes in the event ledger.
11. Allow another authorized user to understand current reality without calling Greg to reconstruct it.

## Testing policy
Manual human QA is reserved for experience, judgment, and workflows that cannot be proven mechanically. Sean/Greg should not become repetitive data-entry testers.

Prefer, in order:
1. deterministic rollback-only database smoke tests,
2. RLS simulation under authorized and unauthorized contexts,
3. compiler/build/deployment evidence,
4. automated inspection of persisted records/events,
5. a minimal human browser proof only when a true browser interaction needs validation.

`database/tests/first_breath_smoke.sql` is the repeatable rollback-only Shared Reality smoke test. It exercises authenticated Engagement creation, verified fact, explicit unknown, provisional resource link, WAITING/Next Move state and ledger events, then rolls everything back.

## Attention rules
- Overdue next action appears in Needs You.
- Active nonterminal Engagement with no next action and not WAITING appears in Needs You.
- BLOCKED appears in Needs You.
- WAITING remains separated until follow-up/next-action timing brings it back.

## Integrity tests
- No single generic status replaces multidimensional states.
- No inventory row is presented as available merely because it exists.
- Unverified price is not presented as current authority.
- AI stub does not pretend to have analyzed anything.
- Core records archive rather than silently disappear.
- Event ledger preserves every material semantic change in one save, not merely the first detected change.
- Private app requires auth.
- Authenticated non-members cannot access Stage Presence shared data.

## Evidence completed — 2026-09-08
- Cloudflare production build passes strict TypeScript and Vite compilation.
- Cloudflare Workers Static Assets deployment succeeds.
- Authorized ADMIN can render and sign into the deployed application in a real browser.
- Browser `+ New` write succeeded and created `SP-000001` with the expected core state.
- Typed source artifact and source-added history were created from the browser intake.
- Browser provenance inspection exposed a capture completeness/actor gap; frontend source preservation was corrected so raw natural capture remains verbatim while manually submitted structured fields are preserved in source metadata and source/note events carry the authenticated actor.
- Simulated authenticated ADMIN sees all 67 provisional resources under RLS.
- Simulated authenticated non-member sees zero memberships and zero resources.
- The persisted TEST Engagement was then exercised without additional user entry under the authenticated ADMIN context:
  - verified fact,
  - explicit material unknown,
  - 17x10 LED Trailer linked as `CONSIDERING`,
  - WAITING state,
  - Next Move,
  - internal note.
- Resulting event history included `ENGAGEMENT_CREATED`, `SOURCE_ADDED`, `FACT_ADDED`, `FACT_MARKED_UNKNOWN`, `RESOURCE_LINKED`, `ATTENTION_STATE_CHANGED`, `NEXT_ACTION_SET`, `NOTE_ADDED`, and `ENGAGEMENT_ARCHIVED` as applicable.
- The TEST Engagement was archived successfully and is no longer active.
- Repeatable rollback-only automated smoke test was added and executed successfully; verification afterward showed 0 active AUTOTEST records persisted.

## Browser-state resilience
The application now persists its current screen/Engagement in the URL hash (`#today`, `#resources`, `#engagement/<id>`, etc.). If a browser unloads or refreshes an inactive tab, the app can reconstruct the previous location instead of resetting all navigation state.

## First Breath status
The core First Breath Shared Reality loop is sufficiently proven for controlled internal use. Additional repetitive manual test entry is not required before beginning a small real-world pilot.

The next evidence phase should come from 3–10 real Engagements entered through normal Stage Presence work, not synthetic QA exercises. Any new petal should be earned by problems observed in that real usage.

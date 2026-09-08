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
- Simulated authenticated ADMIN sees all 67 provisional resources under RLS.
- Simulated authenticated non-member sees zero memberships and zero resources.
- Disposable transaction exercised Engagement create → fact → attention/next move → archive.
- First ledger test exposed a multi-change logging gap.
- Ledger trigger was corrected and retested successfully.
- Corrected disposable loop emitted distinct events for `ENGAGEMENT_CREATED`, `FACT_ADDED`, `ATTENTION_STATE_CHANGED`, `NEXT_ACTION_SET`, and `ENGAGEMENT_ARCHIVED`.
- Disposable records were rolled back; database remains free of fake Engagements/facts/events.
- Engagement number sequence was reset so the first persisted Engagement can be `SP-000001`.

## Remaining First Breath proof
Use the deployed UI itself to persist one clearly labeled internal TEST Engagement and verify:
1. Browser write succeeds.
2. Engagement receives `SP-000001`.
3. It appears in the expected Today/Engagements state.
4. Known fact and material unknown can be added.
5. A provisional resource can be linked without implying reservation.
6. Next Move / WAITING behavior persists correctly.
7. Event history matches the browser actions.
8. Archive removes it from active work without destroying historical evidence.

Only after this browser write-path proof should real customer Engagements enter the system.

# Stage Presence OS — Current Capability Matrix

Status vocabulary:
- LIVE: implemented and available in the proven deployed internal app/backend.
- LIVE BACKEND: live in Supabase/security/data layer; newest browser UX may still await organic runtime proof.
- MAIN / PENDING RUNTIME PROOF: implemented and pushed to `main`; latest Cloudflare/browser result is not independently observable yet.
- PARTIAL: kernel/data support exists but the operating experience is incomplete.
- STAGED: architecture/contract exists but execution is not enabled yet.
- DORMANT: intentionally not built until evidence earns it.

## Identity / access
- Private internal login: LIVE
- Explicit Stage Presence membership allowlist: LIVE
- ADMIN / COMMERCIAL / OPERATIONS / VIEWER roles: LIVE in data/security model; only first ADMIN provisioned so far
- Authenticated non-member isolation via RLS: LIVE / verified

## Engagements / leads / jobs
- Canonical Engagement record: LIVE
- 30 real Goodshuffle-derived active Engagements: LIVE BACKEND
- New opportunity/lead capture as Engagement: LIVE
- Event / Long-Term Rental / Installation / Equipment Sale / Service / Other types: LIVE in kernel
- Stable external `source_key` for legacy-system identity/upsert: LIVE BACKEND
- Lead -> quote -> job as one persistent record: LIVE architectural rule
- Archive instead of destructive delete: LIVE
- Commercial / commitment / operational / attention state dimensions: LIVE

## Dates / location
- Exact event/project start/end timestamps: LIVE
- Date-only event/project start/end when time is unknown: LIVE BACKEND + MAIN UI support
- Venue name: LIVE
- Venue address: LIVE in kernel
- Setup/access/logistics details: PARTIAL through source evidence/facts
- Calendar/scheduling integration: DORMANT

## Clients / contacts / relationships
- Party records for people and organizations: LIVE
- 20 imported real customer/contact Parties: LIVE BACKEND
- 29 current customer links across imported Engagements: LIVE BACKEND
- Customer / primary contact / planner / referrer / venue-contact roles: LIVE
- Email / phone fields: LIVE
- Recurring relationship signal: MAIN / PENDING RUNTIME PROOF
- 3 recurring customer nodes visible in current evidence: LIVE BACKEND evidence
- Standalone relationship/account directory: PARTIAL
- Automatic deterministic dedup/matching: STAGED
- Full account / planner / venue / referral graph and lifetime contribution: STAGED / DORMANT by layer

## Facts / requirements / uncertainty
- Known facts: LIVE
- Explicit unknowns: LIVE
- Explicit conflicting facts: LIVE
- Current imported unresolved truth: 2 conflicting + 6 unknown facts
- Verified / known / estimated / assumed / unknown / requested / conflicting / obsolete / N/A states: LIVE
- Customer request distinct from technical requirement: LIVE architecture
- Provenance to source artifacts: LIVE

## Resources / inventory / capability
- Original inventory workbook evidence: LIVE / provisional
- Goodshuffle resource evidence: LIVE BACKEND
- 45 Goodshuffle resource identities referenced by current imported projects: LIVE BACKEND
- 130 `CONFIGURED` Engagement-resource links: LIVE BACKEND
- `CONFIGURED` relationship: LIVE BACKEND; neutral evidence of project configuration, not availability/reservation
- Clear Goodshuffle matches enrich existing resources rather than duplicating them: LIVE import rule
- Current Goodshuffle-configured price evidence promoted only when mapping is clear: LIVE BACKEND
- Goodshuffle quantity/booked/in-stock fields retained as evidence rather than authoritative physical quantity: LIVE rule
- Existence/configuration does not imply availability: LIVE rule
- Capacity-pressure derivation from overlapping configured physical resources: MAIN / PENDING RUNTIME PROOF
- Current evidence: 3 signed+open physical pressure watch pairs; 0 signed+signed high-pressure pairs
- Holds / reservations / capacity calendar: STAGED next likely petal
- Warehouse pulls / returns / maintenance: DORMANT

## Business Command Layer
- Raw attention queue: superseded as strategic home-screen model
- Protect Delivery: MAIN / PENDING RUNTIME PROOF
- Convert Demand: MAIN / PENDING RUNTIME PROOF
- Capacity Pressure: MAIN / PENDING RUNTIME PROOF
- Relationships: MAIN / PENDING RUNTIME PROOF
- Unresolved Truth: MAIN / PENDING RUNTIME PROOF
- Recently Changed: LIVE baseline

Current backend signal set:
- 3 delivery commitments inside 21 days
- 15 open commercial opportunities
- 3 physical capacity-pressure watch pairs
- 3 recurring customer relationships
- 8 unresolved truth items

## History / auditability
- Event ledger: LIVE
- Database-level logging for Engagement, Fact, Party-link and Resource-link changes: LIVE
- Multiple semantic changes in one Engagement save logged separately: LIVE
- Imported Goodshuffle source artifacts: 32
- Imported Goodshuffle Engagement-source events: 60
- Source SHA-256/reference metadata: LIVE BACKEND
- Internal note events: LIVE
- PHOTO source -> Engagement -> SOURCE_ADDED relationship: LIVE backend / rollback verified

## Capture
- Natural typed/pasted note: LIVE
- Low-friction Quick Capture: current `main`
- Optional type/date/venue/request/next move: MAIN / PENDING RUNTIME PROOF
- Quick Lead Sheet design standard: LIVE as operating document
- Source-agnostic Capture Contract: LIVE architecture
- Private source-artifact Storage bucket: LIVE BACKEND
- Take Photo / Choose Image UI: MAIN / PENDING RUNTIME PROOF
- Photo -> source artifact -> Engagement -> history: LIVE BACKEND / rollback verified
- Photo interpretation/OCR/AI extraction: STAGED; no model connected
- Voice note -> transcript/Engagement: STAGED
- Website inquiry -> Engagement: STAGED
- Email/reference ingestion: STAGED

## Commercial / pricing
- Historical reference pricing: LIVE evidence
- Goodshuffle current configured pricing for clear resource matches: LIVE BACKEND
- Signed Goodshuffle projects map to `WON / SIGNED`, not automatically `CONFIRMED`: LIVE import rule
- Deposit/payment evidence: NOT IMPORTED
- Reservation truth: NOT CLAIMED
- Quick Quote engine: DORMANT until capacity/economic truth improves
- Proposal versions / signature / deposit propagation: DORMANT

## Economics
- $127,804.01 known signed value represented in current limited imported sample: LIVE evidence, not audited company revenue
- largest repeated customer node represents $102,000 / 79.8% of that known signed sample value: LIVE evidence, incomplete history
- direct cost / contribution / cash timing: NOT YET MODELED
- asset economics from Goodshuffle gross-revenue/frequency fields: evidence retained, not audited economics

## Operations
- Business-model delivery prioritization: MAIN / PENDING RUNTIME PROOF
- Full job/preproduction plan: DORMANT
- Crew scheduling: DORMANT
- Asset movement: DORMANT
- Incident/change orders: DORMANT
- Operational closeout: DORMANT

## Finance / external systems
- Goodshuffle historical export translation: LIVE as one-time/import evidence workflow
- Automatic Goodshuffle sync: NOT BUILT
- QuickBooks Desktop integration: NOT BUILT
- Billing/collection automation: DORMANT

## AI
- AI boundary/contracts: LIVE — `src/lib/capabilityRegistry.ts` (2026-09-20); see `docs/CURRENT_STATE.md`
- Paid AI API calls: NONE
- Engagement Interpreter: STAGED behind privacy/cost/authority decision, except a Claude-in-Artifact cockpit calling the Capability Registry, which is scoped-approved per `docs/PERMISSION_GATES.md` (2026-09-20); no such cockpit is built yet
- AI may propose candidates but may not silently convert inference into verified truth
- Named, human-review-gated capability functions (find_contact, find_engagement, create_lead, update_lead, set_next_action, get_pricing, build_quote_draft, save_quote_draft, create_job, update_job, add_resource_requirement, assign_team_member, generate_lead_summary, generate_email, generate_job_sheet, search_stage_presence): LIVE as callable functions; not yet wired to any AI surface

## Current strategic interpretation
Stage Presence OS is no longer an empty Shared Reality prototype. It now contains a meaningful current slice of real Stage Presence customers, Engagements, dates, configured resources, pricing evidence, conflicts and unknowns.

The strongest business-model-driven priorities are now:
1. make the Business Command Layer useful in real daily work;
2. keep reducing capture/data-entry friction;
3. evolve capacity pressure into capacity truth only when the evidence supports holds/reservations;
4. deepen relationship intelligence;
5. acquire direct-cost/contribution evidence before optimizing quote automation.

The system should improve Stage Presence's conversion of relationships, capabilities, capacity, knowledge, founder attention and capital into profitable customer outcomes—not merely become a better database.

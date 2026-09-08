# Stage Presence OS — Current Capability Matrix

Status vocabulary:
- LIVE: implemented and available in the deployed internal app/backend.
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
- New opportunity/lead capture as Engagement: LIVE
- Event Engagements: LIVE
- Long-Term Rental / Installation / Equipment Sale / Service / Other types: LIVE in kernel and now exposed in optional Quick Capture details
- Lead -> quote -> job as one persistent record: architectural rule LIVE; downstream quote/job operations PARTIAL
- Archive instead of destructive delete: LIVE
- Commercial / commitment / operational / attention state dimensions: LIVE in kernel; editing beyond attention/next move is PARTIAL in UI

## Dates / location
- Event/project start: LIVE in kernel and optional Quick Capture
- Event end: LIVE in kernel, not yet exposed in Quick Capture
- Venue name: LIVE in kernel and optional Quick Capture
- Venue address: LIVE in kernel, not yet exposed in Quick Capture
- Setup/access details: supported as facts/source evidence; dedicated UI PARTIAL
- Calendar/scheduling integration: DORMANT

## Clients / contacts / relationships
- Party records for people and organizations: LIVE
- Link customer / primary contact / planner / referrer / venue contact to Engagement: LIVE
- Email / phone fields: LIVE
- Standalone client directory: PARTIAL / not yet a primary screen
- Automatic deterministic dedup/matching: STAGED in Capture Contract, not yet implemented
- Full cross-Engagement customer history / recurrence intelligence: DORMANT

## Facts / requirements / uncertainty
- Known facts: LIVE
- Explicit unknowns: LIVE
- Verified / known / estimated / assumed / unknown / requested / conflicting / obsolete / N/A states: LIVE in kernel
- Customer request distinct from technical requirement: LIVE architecture
- Requirements / constraints / observations / assumptions / preferences: LIVE
- Provenance to source artifacts: LIVE in kernel; capture coverage improving

## Resources / inventory
- 67 provisional resource/capability records: LIVE
- Categories, sourcing model, quantity state, price state: LIVE
- Link resource as customer-requested / considering / recommended: LIVE
- Existence does not imply availability: LIVE rule
- Reservation / hold / capacity calendar: DORMANT
- Warehouse pulls / returns / maintenance: DORMANT
- Inventory conflicts preserved rather than silently reconciled: LIVE

## Attention / continuity
- Next action: LIVE
- Next-action timing: LIVE
- WAITING and BLOCKED context: LIVE
- Today / Needs You / Waiting / Upcoming / Recent changes: LIVE
- Deterministic resurfacing of due waiting work: LIVE
- Automatic outbound follow-up: DORMANT

## History / auditability
- Event ledger: LIVE
- Database-level logging for Engagement, Fact, Party-link, Resource-link changes: LIVE
- Multiple semantic changes in one Engagement save logged separately: LIVE
- Internal note events: LIVE
- Actor attribution for new capture/note paths: LIVE in current code; legacy first test source event predates fix

## Capture
- Natural typed/pasted note: LIVE
- One-note-only Quick Capture: LIVE in current main branch; deployment follows Cloudflare auto-build
- Optional type/date/venue/request/next move: LIVE in current main branch
- Quick Lead Sheet design standard: LIVE as operating document
- Source-agnostic Capture Contract: LIVE as architecture
- Photo of Quick Lead Sheet -> secure source artifact: STAGED; storage not enabled yet
- Photo interpretation/OCR/AI extraction: STAGED; no AI model connected yet
- Voice note -> transcript/Engagement: STAGED
- Email reference -> Engagement: STAGED
- Website inquiry -> Engagement: STAGED

## Web / external intake
- Private internal app: LIVE
- Public website lead form feeding OS: NOT BUILT
- Public direct database access: intentionally prohibited
- Future web intake must use a tightly scoped server-side intake boundary and create source evidence first

## Commercial
- Reference/legacy pricing evidence: LIVE in resource data where available
- Quick Quote engine: DORMANT
- Proposal versions: DORMANT
- Signature: DORMANT
- Deposit/payment: DORMANT
- Signature/deposit governs reservation truth: constitutional rule, operational automation not yet built

## Operations
- Job/preproduction plan: DORMANT
- Crew scheduling: DORMANT
- Asset movement: DORMANT
- Incident/change orders: DORMANT
- Operational closeout: DORMANT

## Finance / external systems
- Goodshuffle read/write integration: NOT BUILT
- QuickBooks Desktop integration: NOT BUILT
- Billing/collection automation: DORMANT
- Engagement contribution/profitability: DORMANT

## AI
- AI boundary/contracts: STAGED
- Paid AI API calls: NONE
- Engagement Interpreter: next Capture petal, not enabled yet
- AI may propose candidates but may not silently convert inference into verified truth

## Current strategic interpretation
The system is already a functioning private Shared Reality kernel for clients/opportunities/jobs, dates, contacts, facts, unknowns, resources, next moves and history.

Its largest current limitation is not storage capacity; it is low-friction ingestion and downstream business automation.

Therefore the next earned petal is Capture rather than more CRM fields.

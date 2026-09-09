# Current State — 2026-09-09

## Canonical system
- Private repo: `firstrateent-star/stage-presence-os`
- Default branch: `main`
- Supabase: `stage-presence-os` (`yaojcuvgtlncytujfxef`), `us-east-1`, `ACTIVE_HEALTHY`
- Hosting: Cloudflare Workers Static Assets
- Production URL: `https://stage-presence-os.falling-butterfly-aad6.workers.dev`
- User previously confirmed a clean Cloudflare build and browser login/live Decision Flow. Newer frontend increments described below each passed the GitHub TypeScript/Vite build gate before merge; their newest Cloudflare auto-deploy has not been independently re-verified in-browser from the current tool environment.

## Current product center

> **History informs. Active inherited work gets enough truth to move. New work is born correctly.**

Goodshuffle seeded the starting reality. It does not define the future workflow, ontology, or user experience.

The current transition is:

**Goodshuffle-seeded history → Active Continuity → Forward-Born Truth → native Stage Presence flow**

The backend remains deliberately richer than Greg's visible experience. Decision-Grade Flow, Exception-Driven Flow, Capacity Truth, provenance, uncertainty, and learning are system machinery. Greg should see the business.

## Product spine in current `main`

### Today
Answers: **What actually matters now?**

Greg-facing sections include:
- Needs You
- Next Up
- Sales
- Team Handling
- Capacity
- Relationships
- trustworthy known committed value only

The detailed Decision Resolver / Exception Engine remains underneath rather than leading the experience.

### Work
Visible navigation label is **Work** while one canonical Engagement remains the backend object.

Work is grouped into:
- Opportunities — current work still being won
- Upcoming Jobs — committed future work
- Past / Needs Resolution — stale, lost, cancelled, closed, or past-dated history

This is presentation only; the data model is not split into Lead / Job objects.

### Engagement
The business-facing top answers: **What is happening with this piece of business?**

It summarizes:
- customer
- date/location
- commercial position and supported value
- capacity signal
- what the customer needs, when represented
- current configured solution
- what happens next

The prior deep editor remains under expandable **Working Details** for evidence, parties, resources, next-move controls, activity, capacity defaults, and learning.

## Active Continuity
Implemented and build-proven before merge.

The 26 current/future Goodshuffle-derived Engagements consist of:
- 13 open opportunities
- 13 committed jobs

Raw legacy gaps currently include:
- 1 missing customer
- 2 missing venue
- 3 without configured solution
- 13 proposals without typed `QUOTE_TOTAL`
- 6 committed records without standalone typed `CONTRACT_TOTAL`
- 23 with weak/inferred capacity timing
- 23 with unknown Engagement-specific sourcing
- 13 committed records with no deposit evidence in Stage Presence OS
- 26 with no direct-cost evidence
- 26 without preserved literal customer-need text

These are **not** treated as a cleanup task list.

Important import artifact discovered:
- 13 imported opportunities carried `Review quote status and set follow-up`
- 13 imported committed jobs carried `Review operational readiness`

Those are import continuity placeholders, not organically captured next moves. Greg-facing surfaces now recognize them and show honest business-state language instead of pretending they are meaningful actions.

WATCH-level legacy incompleteness is also kept out of Greg's Team Handling count unless it becomes decision-relevant.

## Forward-Born Truth
Canonical: `docs/FORWARD_BORN_TRUTH.md`.

Implemented and build-proven before merge.

Current private Quick Capture now preserves the distinction:

**source evidence ≠ structured business truth**

Specifically:
- freeform `What happened?` text is preserved as raw source evidence;
- the whole freeform note is no longer copied into `customer_request`;
- `customer_request` is populated only when the explicit customer-request field is supplied;
- known event/project date can be stored as first-class `event_start_date` without inventing a time;
- date-only submitted truth is preserved in source-artifact metadata;
- photo-only and note-only capture remain valid;
- no AI currently interprets the source;
- no customer Party is created automatically at capture because matching/deduplication has not yet been earned there.

Goal:
**capture once → preserve source → interpret candidates → match existing reality → promote supported truth → ask only material questions → move the Engagement**

## Goodshuffle evidence translation
Live imported state:
- 30 Goodshuffle-derived Engagements
- 20 identified customer/contact Parties
- 29 customer links; one customer remains unknown
- 15 `WON / SIGNED`
- 14 `PROPOSED / UNCOMMITTED`
- 1 `NEW / UNCOMMITTED`
- $127,804.01 known contract value across 9 typed financial-fact Engagements
- 130 `CONFIGURED` Engagement-resource links
- 45 Goodshuffle resource identities represented in current configurations
- 19 project-level configuration facts for custom/untracked lines
- 2 explicit `CONFLICTING` facts
- 6 explicit `UNKNOWN` per-game economic allocations
- 32 Goodshuffle provenance artifact records

Translation rules remain:
- `Contract Signed` → `WON / SIGNED`, not `CONFIRMED`
- no deposit evidence → no reservation inference
- `$0` unresolved program components are not treated as free work
- `CONFIGURED` does not mean requested, recommended, owned, available, held, or reserved
- Goodshuffle quantity fields remain evidence, not physical-inventory truth

### Source-recovery limitation learned
The Goodshuffle import preserved fingerprints/metadata for source spreadsheets but not recoverable spreadsheet bytes in private Storage. The current File Library and connected Gmail do not expose the original Goodshuffle master export. Therefore the 13 missing proposal values cannot currently be recovered automatically from the preserved provenance artifacts.

Do not ask Nancy/Greg to re-enter those values merely for completeness. Recover the original master export later if convenient, or build a source integration only when useful.

Future imports should preserve actual private source files when the document-import seam is deliberately activated.

## Capacity Truth
Canonical: `docs/CAPACITY_TRUTH.md`.

Live:
- resource requirement windows
- certainty: `UNKNOWN / INFERRED_FROM_EVENT / ESTIMATED / KNOWN / VERIFIED`
- Engagement-specific planned sourcing: `OWNED / SUBCONTRACTED / PARTNER / VENUE / UNKNOWN`
- Engagement-level default resource window/sourcing with resource-specific override semantics
- 27 Engagements carry repeated imported event-derived timing once at Engagement scope
- 130 configured links inherit the default rather than duplicating it
- RLS-safe capacity pressure derivation
- current pressure: **3 WATCH / 0 HIGH**

Constitution:
**configuration ≠ requirement window ≠ pressure ≠ hold ≠ reservation**

No holds or reservations exist yet.

## Decision / exception machinery
These remain backend operating principles, not Greg's primary vocabulary.

### Decision-Grade Flow
> What decision is next, what truth could materially change it, and who can resolve the exception?

### Commitment Ladder
1. Quote Ready
2. Commit Ready
3. Reserve Ready
4. Execute Ready

No one generic persisted `ready` status.

### Exception-Driven Flow
Derived gaps can be classified/routed as:
- system-resolvable
- source-recoverable
- group-resolvable
- delegated
- founder exception

Resolution strategies include:
- reuse evidence
- source recovery
- owner confirmation
- policy decision
- human judgment

Resolution Compression rule:
> Resolve truth once at the broadest valid scope, inherit it downward, and override only genuine exceptions.

## Learning / repeatability
Canonical: `docs/REPEATABILITY_ENGINE.md`.

Live backend:
- one `engagement_closeouts` learning record per Engagement
- delivery/cancelled/lost/other closeout kinds
- broad outcome
- optional setup, strike, Greg-dependent minutes
- optional solution change, venue learning, next-time improvement, recurrence
- RLS + event ledger
- `learning_review_signals`
- rollback smoke proof; zero fake closeout data persisted

Current evidence supports future internal archetypes/venue memory but not forced public packages:
- UNC exact visual configuration appears 7x
- 12x7 + load-in/load-out appears 2x
- 17x10 + delivery/pickup appears 2x
- Polk Place appears 7x; several other venues recur

## Business evidence
Observed strategic center remains strongly visual/LED-led:
- 20 imported Engagements include VIDEO
- 5 AUDIO
- 2 LIGHTING
- 4 STAGING
- 3 POWER
- 17x10 LED Trailer appears in 13 Engagements
- 12x7 LED Trailer appears in 12
- MB-5 appears in 8

Relationship concentration remains material:
- 3 recurring Party nodes
- largest node has 7 Engagements
- $102,000 of the currently known $127,804.01 contract value is associated with that recurring node in this incomplete sample

## Capture / source storage
Private Supabase bucket: `source-artifacts`.

Current bucket behavior:
- private
- 15 MB limit
- image MIME types only: JPEG, PNG, WebP, HEIC, HEIF
- active authenticated app members may read
- active members may upload only into their own user-id folder

Do not widen the bucket to arbitrary PDFs/spreadsheets until a real private document/import intake seam exists. The Goodshuffle recovery lesson is recorded, but unused storage capability should not be added merely because it may be useful later.

## Security / platform
- Supabase remains `ACTIVE_HEALTHY`
- app uses publishable browser key only
- explicit `app_members` allowlist + RLS
- only known security-advisor warning remains leaked-password protection, accepted as a Free-plan limitation
- no service-role/DB secret exposed in browser or repo
- do not create Greg/Nancy accounts without explicit Sean approval
- never touch `nfl-dfs-monster`

## Engineering delivery discipline
After intermediate Cloudflare build failures exposed half-finished dependent commits, the project now uses:

**Flower branch → GitHub Build Check (`tsc` + Vite) → clean PR → merge coherent boundary to `main` → Cloudflare**

Recent product increments all passed this gate before merge:
- Greg-facing Today
- Engagement business story
- intuitive Work view
- Active Continuity
- Forward-Born Truth

## Current true boundaries
Not currently claimed:
- automatic Goodshuffle sync
- recoverable Goodshuffle master spreadsheet contents
- QuickBooks integration
- deposit/payment truth
- audited margin/contribution
- reservation/hold truth
- complete physical inventory quantities
- crew/warehouse/maintenance system
- customer/Party auto-matching at capture
- AI interpretation of photo/text sources
- newest Cloudflare auto-deploy after the latest merges until independently observed

## Current direction
The current operating transition is intentionally asymmetric:

1. preserve historical intelligence without reconstructing it;
2. strengthen inherited active work only when a live decision needs truth;
3. make new work enter correctly from source evidence;
4. progressively let native Stage Presence evidence replace Goodshuffle-shaped history;
5. activate AI/source integrations only where they reduce real reconstruction or decision friction and after the relevant privacy/cost/authority boundary is approved.

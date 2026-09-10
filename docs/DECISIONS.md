# Architecture Decision Log

## 2026-09-08 — Clean-slate Stage Presence OS
Decision: Do not extend Stage Presence Hub, Stage Presence Hub (57), or Stage Presence Intake as the canonical system.
Reason: Earlier prototypes encode prior assumptions such as separate Lead → Quote → Event objects, pipeline-centric CRM framing, and premature quote/pricing schema. Preserve them as historical prototypes only.

## 2026-09-08 — Engagement is canonical
Decision: Use one Engagement through the customer/business lifecycle.
Reason: Prevent duplicate state and re-entry; support events, long rentals, installs, sales, and service under one root.

## 2026-09-08 — Multidimensional state
Decision: Separate commercial, commitment, operational, and attention states.
Reason: A single `status` cannot faithfully represent business reality.

## 2026-09-08 — Facts + provenance + uncertainty
Decision: Model structured engagement facts with certainty and source.
Reason: Real production information is frequently partial, estimated, or conflicting.

## 2026-09-08 — Resource snapshot is reference-only
Decision: Import current inventory as provisional, not canonical current availability or pricing.
Reason: Workbook is incomplete and contains conflicting/missing data.

## 2026-09-08 — Attention-first UX
Decision: Home screen focuses on exceptions/next actions rather than KPI dashboards.
Reason: Humans should manage attention while the system manages continuity.

## 2026-09-08 — No paid AI in first breath
Decision: Create an interpreter contract/boundary without external paid model calls.
Reason: Prove workflow and data architecture before incurring AI cost.

## 2026-09-08 — Lovable credit boundary reached
Decision: Do not purchase or add Lovable credits automatically.
Reason: User explicitly expressed concern about credit usage; workspace returned out-of-credits error. Build remains uncreated until user chooses how to proceed.

## 2026-09-08 — Dedicated free Supabase project
Decision: use a separate `stage-presence-os` Supabase project rather than sharing the NFL DFS database. The organization cost check reported $0/month. This keeps business boundaries explicit and avoids coupling unrelated projects.

## 2026-09-08 — Block GitHub publication until private
Decision: do not commit Stage Presence OS source or architecture to GitHub while the repository API reports `visibility: public`. The application is an internal business system; repository privacy is a security invariant.

## 2026-09-08 — GitHub becomes canonical memory
Decision: `firstrateent-star/stage-presence-os` is the canonical home for code, architecture, business-model reference, migrations, and current-state documentation.
Reason: continuity must not depend on one ChatGPT/Lovable conversation. The repository is private before Stage Presence business information is committed.

## 2026-09-08 — Preserve business model beside system model
Decision: maintain `docs/BUSINESS_MODEL_CURRENT.md` as a first-class reference separate from software architecture.
Reason: Stage Presence OS exists to model and improve a business organism. Future builders must understand the company, its economic engines, strategic center, current systems, constraints, and hypotheses rather than reducing the project to CRUD requirements.

## 2026-09-09 — Legacy systems are evidence sources, not architecture
Decision: Goodshuffle, QuickBooks, spreadsheets and other legacy systems may supply evidence, identifiers and historical context, but they do not define the Stage Presence OS object model, workflow, statuses or truth semantics.
Reason: importing legacy structure wholesale would reproduce the constraints the new system is intended to remove. Stage Presence OS translates source evidence into its own Engagement / Party / Fact / Resource / Event model while preserving provenance and uncertainty.

## 2026-09-09 — Date-only truth is first-class
Decision: support project/event dates separately from exact timestamps.
Reason: real Stage Presence evidence frequently knows the event date while the exact event time remains TBD. The OS must not invent midnight timestamps merely to satisfy a software field.

## 2026-09-09 — CONFIGURED is a neutral resource relationship
Decision: add `CONFIGURED` to Engagement-resource relationships for imported or otherwise evidenced project configurations.
Reason: a line item appearing on a project does not necessarily mean customer-requested, recommended, reserved, available or owned. `CONFIGURED` preserves what the source says without overstating commitment/capacity truth.

## 2026-09-09 — Business command surface over raw attention queue
Decision: evolve Today from a raw `NEEDS_ATTENTION` list into a business-model command surface centered on Protect Delivery → Convert Demand → Capacity Pressure → Relationships → Unresolved Truth.
Reason: once real operating data is loaded, a generic exception queue recreates Greg's cognitive bottleneck. The home surface should allocate scarce human attention according to Stage Presence's value-creation and risk model.

## 2026-09-09 — Relationship value is first-class
Decision: recurring customer/relationship nodes must be surfaced independently of individual Engagement status.
Reason: imported evidence already shows substantial concentration and recurrence; job-by-job views hide both lifetime opportunity and concentration risk.

## 2026-09-09 — Capacity pressure precedes reservation automation
Decision: surface overlapping configured physical resources before implementing full holds/reservations.
Reason: current evidence already reveals overlapping signed/proposed demand on scarce visual assets. Early warning is valuable now, while the system must still avoid claiming availability or reservation truth without signature/deposit/capacity evidence.

## 2026-09-09 — Requirement Window is separate from configuration and reservation
Decision: each configured Engagement-resource link may carry an explicit requirement window, epistemic state, and Engagement-specific planned sourcing model.
Reason: event dates alone are not sufficient to represent when scarce capacity is actually occupied. At the same time, requirement timing is still not a hold or reservation. The OS must preserve the sequence CONFIGURED → REQUIREMENT WINDOW → PRESSURE → HOLD → RESERVATION rather than collapsing these truths.

## 2026-09-09 — Capacity verification follows decision leverage
Decision: verify uncertain resource quantity/timing/sourcing first where that uncertainty can change a live commitment decision.
Reason: a full inventory audit creates work without necessarily creating value. Scarce resources participating in signed/open overlap deserve verification before low-use accessories with no current decision impact.

## 2026-09-09 — Routine flow should be fast; humans handle exceptions
Decision: future commercial and operating automation should default routine, well-evidenced work through deterministic paths and surface Greg/Sean/Nancy only for material exceptions.
Reason: Stage Presence scales by moving continuity and calculation into systems while preserving human judgment for relationships, technical ambiguity, scarce capacity, pricing/risk exceptions and unusual commitments.

## 2026-09-09 — Commitment readiness is a ladder, not one status
Decision: model operational decision readiness conceptually as Quote Ready → Commit Ready → Reserve Ready → Execute Ready rather than adding one persisted `ready` or `confirmed` field.
Reason: these decisions require different evidence. A job can be safe to quote without being safe to reserve, and a signed job can still lack deposit/capacity or execution evidence. Readiness should be derived, explainable and exception-aware. Canonical design: `docs/COMMITMENT_LADDER.md`.

## 2026-09-09 — Standardize internal knowledge before customer-facing packages
Decision: develop reusable internal solution archetypes from repeated evidence rather than forcing rigid public packages from the current sample.
Reason: the import already contains exact recurring visual configurations, but complex production remains heterogeneous. Internal archetypes can reduce reconstruction, quoting and prep work while preserving custom outcome design.

## 2026-09-09 — Lightweight closeout moves earlier because it creates future evidence
Decision: prioritize a low-burden learning closeout before building a large warehouse/crew/operations module.
Reason: actual resource use, timing, venue learning, labor, sourcing, scope changes and financial actuals are the inputs required to improve capacity, pricing, archetypes, training and recurrence. Every delivered Engagement should make future work easier. Canonical design: `docs/REPEATABILITY_ENGINE.md`.

## 2026-09-09 — Chat-first operating desk is transitional
Decision: use ChatGPT as a low-cost interpretation/operating-desk bridge during Operational Validation, but do not treat that workflow as the target architecture.
Reason: real photos, text, conversations and updates can teach us what the native Stage Presence ingestion/interpreter layer must do before we spend more capital. As Stage Presence and Vlourish scale and hosting/storage/AI/integration economics justify it, this intake and interpretation should progressively move into Stage Presence OS itself. The backend must therefore remain compatible with eventual native secure capture, source retention, interpretation/matching and exception-only human review.

## 2026-09-09 — Frontend reads should be business contracts, not table choreography
Decision: add stable read models for Engagement list/dashboard, complete internal workspace, economics, contributor work, relationship memory, location memory, resource commitments and a curated future client surface.
Reason: the UI must remain simpler than the business model. Requiring each screen to join many canonical tables independently duplicates business logic and makes schema evolution unnecessarily expensive.

## 2026-09-09 — Seven operating petals organize backend growth
Decision: organize frontend-relevant backend reality under People, Engagement, Money, Capability, Time/Place, Evidence/Outputs and Learning while preserving Engagement as the root.
Reason: these domains cover the realities already evidenced by the business model without creating disconnected CRM, accounting, inventory, scheduling and portal systems.

## 2026-09-09 — Client participation is modeled before client access is activated
Decision: represent client/shared action visibility and scoped Engagement access grants, but keep all current database access inside the authenticated `app_members` boundary.
Reason: a future client experience needs a deliberate, curated contract. Merely adding a portal-shaped view must never expose internal costs, notes, evidence or operational data.

## 2026-09-09 — Economic flow separates document, cash, cost and contribution
Decision: add direct Engagement cost items and an evidence-aware economics read model rather than deriving profit from quote/invoice totals alone.
Reason: revenue is not cash and cash is not contribution. Direct-cost evidence may be partial, so the read model must expose its evidence state instead of overstating margin certainty.

## 2026-09-09 — Program-level economics override literal zero component documents
Decision: when source evidence explicitly says a component's economic allocation is unknown, a `$0` child document must remain economically unknown rather than becoming zero revenue/zero receivable truth.
Reason: the UNC season proves a source document can be operationally useful while its project-level total is not a valid economic allocation. Unknown is legitimate data.

## 2026-09-09 — Capacity commitment and actual usage are first-class and distinct
Decision: add explicit resource hold/reservation/allocation records separately from actual resource-usage records.
Reason: configured fulfillment evidence is not capacity commitment, and reservation is not proof of what actually went to the job. Both are required for reliable future capacity and asset economics.

## 2026-09-09 — Venue text may be promoted only by exact canonical evidence
Decision: normalize existing Engagement venue name/address pairs into reusable Location records using exact canonical text, with no fuzzy merging.
Reason: recurring venue memory creates value immediately, but premature entity resolution could silently merge different sites. Exact promotion provides reuse without false certainty.

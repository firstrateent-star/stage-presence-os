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
Reason: once real operating data is loaded, a generic exception queue recreates a cognitive bottleneck. The home surface should allocate scarce human attention according to Stage Presence's value-creation and risk model.

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
Decision: future commercial and operating automation should default routine, well-evidenced work through deterministic paths and surface people only for material exceptions.
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
Reason: real photos, text, conversations and updates can teach us what the native Stage Presence ingestion/interpreter layer must do before we spend more capital. As usage and economics justify it, this intake and interpretation should progressively move into Stage Presence OS itself. The backend must remain compatible with eventual native secure capture, source retention, interpretation/matching and exception-only human review.

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

## 2026-09-10 — Process knowledge is separate from job-state truth
Decision: represent Stage Presence's reusable start-to-finish lifecycle in versioned `operating_playbooks` / `operating_playbook_steps`, while keeping actual per-Engagement applicability/completion in optional `engagement_step_states`.
Reason: Stage Presence needs the whole operating path available as institutional knowledge, but a standard step existing must never be interpreted as evidence that the step applies, is due, or has been completed on a specific job. Canonical design: `docs/JOB_LIFECYCLE_PLAYBOOK.md`.

## 2026-09-10 — Do not materialize the whole Playbook as tasks
Decision: `work_items` remain attention/movement records and may reference Playbook steps; the system must not automatically create one task for every applicable lifecycle step.
Reason: a 100-step knowledge base is valuable, but a 100-item task list on every Engagement would recreate administrative burden. The system should open work only when an actual action, decision, dependency, exception or evidence requirement needs attention.

## 2026-09-10 — Assignment is role plus concrete responsibility
Decision: keep Engagement-level assignment (`engagement_assignments`) separate from step-level responsibility (`engagement_step_assignments`). Step responsibility may be LEAD, SUPPORT, APPROVER, CONSULTED or INFORMED.
Reason: assigning a contributor as “Video Tech,” “PM,” or “Labor” does not tell the organization which parts of the job they actually own. Granular responsibility must be available without duplicating the entire process as disconnected tasks.

## 2026-09-10 — Technical and safety knowledge has explicit maturity depth
Decision: each Playbook step carries `procedure_depth = MAP_ONLY / CHECKLIST / SOP / VERIFIED_SOP`. Technical/safety-sensitive steps are seeded conservatively as MAP_ONLY unless qualified evidence supports more detail.
Reason: knowing that a process step exists is different from possessing a safe, manufacturer/site-specific, reviewed procedure. AI plausibility is not sufficient evidence to promote technical or safety instructions to verified SOP status.

## 2026-09-10 — Today and Work begin consuming operating read contracts
Decision: progressively move the live frontend from screen-specific business reconstruction onto `engagement_frontend_v`, `daily_work_queue_v`, and relationship/read-model contracts while retaining the existing detail editor during transition.
Reason: the backend should own business interpretation and the frontend should primarily present it. Progressive migration reduces breakage and lets missing truth surface through real use rather than a large UI rewrite.

## 2026-09-10 — Selective Movement is derived before it is automated
Decision: add deterministic `engagement_movement_candidates_v` and `engagement_operating_focus_v` as read-only reasoning surfaces before allowing candidate signals to create work automatically.
Reason: Stage Presence should know what may matter without manufacturing obligations. Separating derived recommendation from persisted work lets the company observe false positives/negatives, inspect evidence and governance, and earn automation gradually. Canonical design: `docs/SELECTIVE_MOVEMENT_ENGINE.md`.

## 2026-09-10 — Business consequence outranks missing-data completeness
Decision: candidate movement is activated by lifecycle state, time pressure, decision leverage, materiality, economics and delivery risk—not merely because a database field or native record is absent.
Reason: inherited Goodshuffle work can carry valid commercial/fulfillment evidence while lacking native schedule or assignment records. Empty fields should become human work only when resolving them protects delivery, economics, conversion, coordination or learning. The operating focus orders `NOW → SOON → WATCH → LATER`, then ranks consequence within the horizon.

## 2026-09-10 — Persisted work and System Sees remain visibly distinct
Decision: Today presents persisted `daily_work_queue_v` action reality separately from derived selective-movement recommendations. Existing open work for the same Engagement + Playbook step marks a candidate `COVERED` rather than creating a duplicate.
Reason: users must be able to tell what the business has actually committed to doing from what the model merely recommends. This distinction is a prerequisite for trustworthy low-touch automation.

## 2026-09-10 — Aggregate collection snapshots are baselines, not transaction ledgers
Decision: treat imported/document `amount collected` values as dated aggregate baselines and add only payment transactions occurring after that baseline when calculating the current collected position.
Reason: imported Goodshuffle cash truth already includes earlier receipts. Adding every later-created payment row to that number would double-count history, while letting the baseline always win would make new receipts invisible. `engagement_cash_position_v` preserves both realities and exposes overlap/reconciliation state.

## 2026-09-10 — Company operating costs are separate from direct Engagement costs
Decision: store non-job operating expense evidence in `company_cost_items` rather than forcing insurance, software, facility, admin, vehicle, financing and similar costs onto Engagements.
Reason: direct contribution answers whether a job economically creates value before general company overhead. Company operating economics require another layer; collapsing the two would make job comparison and company economics both less trustworthy.

## 2026-09-10 — Asset economics are append-oriented and separate from operational inventory
Decision: store ownership/value/financing/replacement/maintenance observations in `resource_economic_snapshots`, independently of Resource quantity, availability, commitments and usage.
Reason: an LED trailer can be operationally configured or available without its book/market/replacement economics being known. Later value estimates must create new snapshots rather than rewrite earlier economic evidence.

## 2026-09-10 — Contribution is not promoted to profit
Decision: continue presenting Engagement contribution where supported, but do not calculate or label company profit until direct-cost, company-cost, funds and any required accounting coverage is explicit enough to support the claim.
Reason: a mathematically precise number built from incomplete economic coverage would be less truthful than an intentional unknown. The company Economy surface should expose evidence coverage beside value.

## 2026-09-12 — Recovery is a derived review layer, not a second truth store
Decision: derive recovery/review candidates from existing evidence, unresolved truth and operating gaps; persist only human disposition in `recovery_item_decisions`; resolve accepted truth into its owning canonical domain.
Reason: Stage Presence needs a way to surface recoverable legacy reality and consequential unknowns without turning every database blank into work or creating another parallel job record. The Recovery Queue must reduce as canonical reality is populated.

## 2026-09-12 — Populate existing architecture before adding abstractions
Decision: make the current roster, capability, schedule, Work, Playbook-state, Resource, payment, cost, commitment, usage and closeout structures carry real business evidence before designing new domain objects.
Reason: the first population pass reduced Recovery from 54 active candidates / 21 directly recoverable candidates to 33 active / 0 direct-recover candidates without adding a new business abstraction. This is evidence that much of the current gap is operational adoption and source promotion rather than schema deficiency.

## 2026-09-12 — Compatibility fields are fallback, not future write authority
Decision: existing Engagement compatibility fields may remain for inherited reality, but new Venue and Next Move workflows write to `locations` / `engagement_locations` and `work_items`. Current UI may project canonical values back into legacy-shaped presentation contracts during transition.
Reason: continuing to write `engagements.venue_name`, `next_action`, `next_action_at`, `waiting_on` and `blocked_reason` would create dual truth and make later migration harder. One-way canonical write + compatibility read preserves continuity without reinforcing duplication.

## 2026-09-12 — Legacy placeholder actions are not automatically Work
Decision: do not bulk-promote inherited actions such as `Review operational readiness` or `Review quote status and set follow-up` into `work_items` merely because the root compatibility field is populated.
Reason: inspection showed 24 such root actions without open Work; most are known import placeholders rather than evidence of a current human obligation. Business work must be earned by actual continuity/decision evidence.

## 2026-09-12 — Possible Solution and Commitment aggregates remain hypotheses
Decision: keep solution design and explicit commitment/change-control as candidate abstractions only. Do not implement them until repeated live work demonstrates that requirements/facts, commercial documents, fulfillment, Work, state and provenance cannot represent the necessary decision truth without recurring reconstruction or ambiguity.
Reason: architecture should expand from observed failure, not conceptual elegance. Current priority is to use the model deeply enough to discover whether these abstractions are genuinely missing.

## 2026-09-12 — Price Book and Cost Book become governed operating authorities
Decision: activate the existing `pricing_rules` and `economic_rate_profiles` models as the reusable selling-price and cost-policy homes, while keeping historical quotes, Goodshuffle/current Resource references and user-supplied rates as evidence or DRAFT candidates until explicitly approved. Add explicit rental charge basis, duration, pricing position and role scope rather than hiding those dimensions in metadata or conflating sell price with pay cost.
Reason: real Stage Presence quoting must represent structures such as per-panel/per-day rental rates, role sell rates, duration tiers, floors/targets and internal labor/vendor/material costs. The existing single pricing `rate_type` could not faithfully represent `$80 per panel per day`, and Price / Sale / Cost / Cash must remain separate. Approved policy should become reusable authority; evidence should remain inspectable without silently becoming policy.

## 2026-09-12 — Estimate Runtime reuses the direct-cost ledger
Decision: do not create a second estimate header/line aggregate. `engagement_cost_items` remains the canonical job-cost ledger and progresses through `ESTIMATE → COMMITTED → ACTUAL → CANCELLED`. Add read contracts and application commands around that ledger, and snapshot any reusable Cost Book rate when it is applied to a job.
Reason: the existing cost model already carries quantity, unit cost, amount, contributor/resource/vendor links, fulfillment/commercial linkage, reusable rate linkage, rate snapshot, provenance and certainty. A separate estimate model would duplicate economic truth and create reconciliation debt. Missing cost remains an explicit coverage gap rather than `$0`, DRAFT rates require explicit opt-in, and later Cost Book revisions must never rewrite historical job economics. Canonical design: `docs/ESTIMATE_RUNTIME_V1.md`.

## 2026-09-20 — Stage Presence Capability Registry
Decision: add `src/lib/capabilityRegistry.ts` as the fixed, named action surface for any AI operating layer (Greg cockpit, chat operating desk, future automation). Every entry wraps an existing canonical `src/lib` function or performs a read-only query against an existing table/view. No new writes, no new abstractions, no separate "Lead"/"Job" entity.
Reason: an AI layer must call named, reviewable business actions instead of freely writing SQL — the same "UI must not touch tables directly" discipline already enforced on the human frontend (`scripts/backendContracts.test.mjs`). Reused the existing OBSERVE/SUGGEST/REVERSIBLE/CONSEQUENTIAL authority vocabulary from Capture Intelligence rather than inventing a new one. Structurally enforced by `scripts/capabilityRegistry.contract.test.mjs`, which requires every CONSEQUENTIAL entry to declare `requiresHumanReview: true`.

## 2026-09-20 — GregMode pricing writes routed through pricingRuntime
Decision: extract `GregMode.tsx`'s four direct `pricing_rules` mutations (edit, approve, retire, create-draft) into named functions in `src/lib/pricingRuntime.ts` (`updatePricingRuleFields`, `approvePricingRule`, `retirePricingRule`, `createManualPricingRule`).
Reason: these direct writes predated this pass (introduced in the prior "Greg Command Center v1" work) and were already failing the repo's own `backendContracts.test.mjs` "no component writes canonical backend tables directly" contract. Fixing this reinforces the exact discipline the Capability Registry depends on.

## 2026-09-20 — Resume development; Capture Interpreter gate scoped for Claude-in-Artifact usage
Decision: Greg explicitly chose to resume development (default is otherwise "operate and learn, not keep building") and to move forward on the Capture Interpreter / external AI processing gate in `docs/PERMISSION_GATES.md`, specifically for a Claude-powered Artifact cockpit rather than a server-side paid third-party API integration. That gate requires nine items resolved before activation; resolution for this specific form:
1. Provider/project ownership — not applicable as scoped: Claude runs inside an Anthropic Artifact under the viewer's own Claude account; no separate Stage Presence-owned API project or key exists.
2. Data boundary — the Artifact must call only the Capability Registry's read functions (`find_contact`, `find_engagement`, `get_pricing`, `search_stage_presence`, `generate_lead_summary`/`generate_email`/`generate_job_sheet`), never broad table access.
3. Output authority — unchanged: AI output is candidate interpretation only, never verified business truth.
4. Promotion authority — unchanged: no silent contractual, pricing, capacity, payment, reservation, or safety commitments; every CONSEQUENTIAL capability requires human review before commit.
5. Confidence handling — unchanged: material ambiguity stays visible.
6. Matching — unchanged: `find_contact`/`find_engagement` return literal-match candidates only; no automatic dedup/merge.
7. Cost/budget — not applicable as scoped: no metered API key means no separate Stage Presence budget line; usage is bounded by the viewer's own Claude account.
8. Secrets — not applicable as scoped: no API key exists to leak; nothing server-side is introduced.
9. Logging/retention — capture review continues through the existing `CAPTURE_REVIEW_RECORDED` event pattern (`captureReviewTrace.ts`) when Artifact proposals are approved or rejected.
Reason: this resolution covers only the Claude-in-Artifact approach described above, because it structurally lacks the provider/budget/secrets surface the original gate was written to guard. A future server-side paid AI integration (for example, automated photo/OCR interpretation running without a human in the loop) is a materially different case and still requires the original gate's full resolution, including a real provider, budget, and secrets decision.

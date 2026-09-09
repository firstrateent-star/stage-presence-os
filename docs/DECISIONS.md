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

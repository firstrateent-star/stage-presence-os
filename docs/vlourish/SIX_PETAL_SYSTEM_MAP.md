# Stage Presence — Six-Petal System Map v0.1

This document maps the current Stage Presence implementation into the Vlourish technical constitution. It is a navigation and responsibility map, not a request to physically move every file/table into matching folders.

## Center — Aligned Value

Current business orientation:
- reliable delivery
- clear operating reality
- sustainable contribution
- strong customer / partner relationships
- reduced unnecessary founder dependency
- learning that compounds across work

## Petal 1 — Knowledge & Canon

Stage Presence instance knowledge:
- `docs/BUSINESS_MODEL_CURRENT.md`
- business-model evidence docs
- `docs/REALITY_RECOVERY_DISCOVERY.md`
- operating principles / current-state references
- Stage-specific ADRs
- Playbook definitions and process knowledge

Vlourish methodology Canon should not be duplicated here. This repo records how the instance applies it.

## Petal 2 — Architecture & Contracts

Primary responsibility:
- domain meanings
- canonical homes
- source-of-truth boundaries
- application command boundaries
- state semantics
- authority rules
- data contracts

Current implementation examples:
- normalized Supabase schema
- views / read models
- RLS policies
- application repositories and canonical write helpers
- System Instance Contract
- Authority & Evidence Contract
- architecture decision records

## Petal 3 — Runtime & Intelligence

Current derived / intelligent behavior:
- Recovery Queue
- selective movement engine
- operating focus
- Delivery Readiness
- capacity pressure signals
- pricing / commercial observations
- future bounded agents

Rule:
Derived intelligence may recommend, rank and explain. It must not silently become canonical operational truth.

## Petal 4 — Data & Reality

Canonical structured instance reality currently includes:
- engagements
- parties / engagement parties / relationships
- locations / engagement locations
- facts
- resources / engagement resources
- fulfillment plans / lines
- schedules
- team members / capabilities / assignments
- work items / step states
- commercial documents / lines
- payment schedule / payments when supported
- costs when supported
- resource commitments
- resource usage
- outputs
- closeouts
- source artifacts / segments
- events / provenance

Read models may aggregate this reality for interfaces but do not become new truth stores.

## Petal 5 — Evidence & Evaluation

Current evidence foundations:
- source artifacts and source segments
- source-linked structured facts
- events / audit history
- commercial and fulfillment evidence
- delivery actuals
- closeouts
- economy coverage / uncertainty

Still developing:
- AI eval datasets
- regression tests for intelligent workflows
- standardized technical traces
- explicit value-outcome evaluation across interventions

These should be introduced when intelligent workflows become real enough to test, not as empty enterprise scaffolding.

## Petal 6 — Delivery & Governance

Current governance path:
- feature branch
- implementation / migration
- tests / typecheck / build
- Cloudflare preview
- review
- merge to `main`
- production deployment
- observation / evidence

Database rule:
DDL through versioned migrations. Production changes should not be improvised through UI-only edits or undocumented raw DDL.

## Surrounding field — Unknown

Current high-value unknowns / seams:
- whether solution design needs its own aggregate
- whether explicit commitment / change-control needs its own aggregate
- equipment-sale actual / asset-transfer semantics
- approved pricing authority
- complete job-cost truth
- verified resource quantities / sourcing
- transaction-level payment evidence
- mature role / object-level authorization
- future AI-agent runtime, eval and trace requirements

Unknown is not a failure state. It is represented, ranked by decision leverage, and resolved through evidence or explicit business decision.

## Interface rule

The frontend should expose role/context-specific slices of one shared backend.

The depth of the backend should reduce—not increase—the cognitive burden placed on the human.

Current surfaces include:
- Today
- Capture
- Work
- Relationships
- Recovery
- Economy
- Resources / emerging Capability
- Playbook
- Engagement workspace
- Delivery Actuals / Closeout

These surfaces are projections of shared reality, not separate systems.
# Stage Presence — Vlourish System Instance Contract v0.1

**Status:** Accepted working contract  
**Instance:** Stage Presence  
**Domain:** Business → Event Production / Live Visual Production & Integration  
**Vlourish center:** Aligned Value

This contract describes the Stage Presence system boundary. It does not duplicate Vlourish Canon; it applies the Vlourish constitution to this specific operating instance.

## 1. Purpose

Stage Presence converts customer communication and experiential objectives into reliable temporary or permanent production systems, with a strategic center in LED/display capability and adjacent audio, lighting, staging, rigging, content, labor, logistics, installation and support.

Primary value dimensions currently supported by business evidence:
- delivery reliability
- clarity of operating reality
- commercial speed and continuity
- contribution / profitability
- customer and partner relationship value
- efficient use of constrained capability
- reduced founder-memory dependency
- learning from completed work

## 2. Stakeholders

Known stakeholder classes:
- Owner / founder / commercial-technical authority
- Sales / operations
- Commercial administration / quoting / collections
- Project management
- Employees and contractors
- Technical crew
- Customers
- Planners / agencies
- Venues
- Production partners / suppliers
- Accounting / financial systems
- Vlourish systems operator / consultant
- Future bounded AI agents

## 3. System boundary

Stage Presence OS owns the structured operational representation of:
- Engagements and lifecycle state
- parties, relationships and relationship memory
- customer needs / requirements / observations / uncertainty
- locations and venue memory
- represented resources and sourcing
- engagement-specific resource need
- fulfillment scope
- schedules
- team roster, capabilities and assignments
- work / next actions / operating focus
- commercial-document representations and engagement-level economic visibility
- resource commitments and actual usage when supported
- delivery actuals
- closeout and learning
- provenance, source artifacts and events

Stage Presence OS does **not** currently claim to be:
- the formal general ledger
- the authoritative raw email store
- the authoritative repository for signed/file artifacts themselves
- a universal inventory truth source where current evidence is incomplete or transitional
- Vlourish methodology Canon

## 4. Canonical source map

### Operational truth
**Stage Presence OS / Supabase** is the canonical structured operational system for the domains it represents.

### Formal accounting truth
**QuickBooks Desktop** remains accounting / general-ledger authority. Stage Presence OS may hold engagement-level commercial and economic representations, but must preserve source and authority distinctions.

### Communication truth
The originating communication system (for example Gmail) remains authority for the original message. Stage Presence OS may store references, summaries, extracted facts and operational interpretations with provenance.

### Document / artifact truth
Drive, Dropbox or other approved artifact storage remains authority for the original file. Stage Presence OS references artifacts and stores structured interpretations; the structured record does not replace the original document.

### Inventory / historical event evidence
Goodshuffle remains a transitional historical/operational evidence source where its records are the strongest available source. Stage Presence OS is progressively becoming the structured operating authority as evidence is recovered, verified and used natively.

### Methodology truth
Vlourish methodology belongs in Vlourish Canon, not in this instance repository except where this repo records instance-specific application decisions.

## 5. Canonical-home rules

New workflows should prefer:
- Venue → `locations` + `engagement_locations`
- Requirements / observations / uncertainty → `engagement_facts`
- Resource need → `engagement_resources`
- Accepted intended delivery scope → `fulfillment_plans` / lines
- Detailed timing → `engagement_schedule_items`
- People on jobs → `engagement_assignments`
- Action / next movement → `work_items`
- Planned resource hold / reservation / allocation → `resource_commitments`
- Actual resource use → `resource_usage`
- Learning / actual outcome → `engagement_closeouts`
- Generated documents → `engagement_outputs`, while structured business truth remains canonical elsewhere

Compatibility fields may remain for inherited data, but new workflows should not reinforce duplicate truth.

## 6. Primary workflow

Customer intent → requirements → solution → feasibility → commitment → capacity → preparation → delivery → actuals → closeout → learning → relationship / recurrence.

The software should preserve distinctions among:
- observed reality
- inferred / uncertain reality
- planned reality
- committed reality
- actual reality

## 7. AI authority default

Until a more specific policy explicitly overrides it:
- AI may OBSERVE structured reality and source evidence.
- AI may SUGGEST interpretations, priorities, pricing, schedules and actions.
- AI may create or update reversible internal drafts / tentative records only through governed application commands and with provenance.
- Consequential actions require explicit human approval.

Examples of consequential actions:
- send a customer quote
- change approved pricing policy
- commit scarce equipment
- issue refund or payment
- sign / accept agreement
- delete material business records
- represent an unverified plan as actual truth

## 8. Known unknowns / active architecture seams

These are intentionally unresolved rather than hidden:
1. **Solution design abstraction** — current Facts + Resources + Commercial + Fulfillment may or may not be sufficient as solution complexity grows.
2. **Explicit commitment / change-control abstraction** — accepted documents + commitment state may or may not be sufficient for partial acceptance, revisions and change orders.
3. **Equipment-sale actuals** — transfer / disposition semantics may differ materially from `resource_usage`.
4. **Pricing authority** — historical/reference pricing exists, but approved current pricing rules remain incomplete.
5. **Cost rates / job costing** — evidence remains incomplete; absence must not be filled with customer-facing price data.
6. **Inventory authority** — Stage Presence OS is progressing toward structured capability truth, but current owned quantities and sourcing confidence remain mixed.
7. **Payment transaction detail** — aggregate imported collection evidence must not be treated as transaction-level payment truth without evidence.

## 9. Metrics to develop from evidence

Current candidate measures include:
- engagement contribution where costs are supported
- contribution per constrained capability unit
- quote / response latency
- conversion by opportunity / relationship type
- utilization of constrained assets
- customer recurrence / referral
- founder-dependent minutes
- crew / schedule readiness
- variance between planned and actual resources / labor / timing
- recovery / unknown burden

Candidate metrics do not become governance targets until definitions and evidence quality are sufficient.

## 10. Operating rule

> Use and populate existing canonical structures first. Move information to its canonical home. Do not create duplicate truth. Observe repeated model failure. Only then introduce a new abstraction or migration.

This is the current Stage Presence application of the Vlourish principle that reality outranks the model.
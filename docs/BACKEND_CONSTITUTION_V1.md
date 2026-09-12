# Stage Presence OS — Backend Constitution v1

Status: Candidate operating constitution for backend hardening before frontend rebuild.

## Center

The backend exists to preserve **Shared Business Reality** for Stage Presence.

Reality outranks presentation. Evidence outranks inference. A UI, agent, import, report, or document may propose or render truth, but canonical operational truth lives in the owning domain.

## Current live foundation

As of 2026-09-12, the live Supabase public schema contains:

- 44 physical tables
- 35 purpose-built views
- RLS enabled on all 44 tables
- `security_invoker` enabled on all 35 views
- 44 primary keys
- 158 foreign keys
- 169 CHECK constraints
- 41 unique constraints

This is not a prototype database. The hardening task is primarily semantic and governance-oriented, not a rebuild.

## Backend planes

### 1. Evidence Plane — why we believe something

Canonical objects:

- `source_artifacts`
- `source_artifact_segments`
- `events`

Rules:

- Preserve original source evidence before interpretation when practical.
- Derived intelligence must retain provenance.
- Review/evaluation traces belong here; they are not business truth.
- Events are append-oriented audit/learning evidence, not the primary state store.

### 2. Identity & Relationship Plane — what exists and how it is connected

Canonical objects:

- `engagements`
- `parties`
- `party_relationships`
- `engagement_parties`
- `engagement_relationships`
- `locations`
- `engagement_locations`
- `resources`
- `engagement_resources`
- `team_members`
- `team_member_capabilities`

Rules:

- Identity is not state.
- A relationship record owns relationship semantics; do not encode the same relationship independently in free text.
- Resources represent deliverable capability evidence, not guaranteed availability.

### 3. Commitment & Plan Plane — what Stage Presence intends or has committed to do

Canonical objects:

- `commercial_documents`
- `commercial_document_lines`
- `commercial_payment_schedule`
- `fulfillment_plans`
- `fulfillment_plan_lines`
- `work_items`
- `operating_playbooks`
- `operating_playbook_steps`
- `engagement_step_states`
- `engagement_step_assignments`
- `engagement_schedule_items`
- `engagement_assignments`
- `resource_commitments`

Rules:

- Commercial scope is not fulfillment scope.
- Configured resources are not reserved resources.
- Crew possibility is not crew confirmation.
- Work is an explicit action obligation; Unknown is not automatically Work.

### 4. Actuals Plane — what actually happened

Canonical objects:

- `commercial_payments`
- `resource_usage`
- `engagement_cost_items`
- `engagement_closeouts`

Supporting evidence:

- completed `engagement_assignments`
- actual schedule/operational events where represented

Rules:

- Planned ≠ committed ≠ actual.
- A closeout cannot silently infer payment, resource usage, labor completion, or direct cost.
- Absence of an actual record means **not represented**, not **did not happen**.

### 5. Policy & Knowledge Plane — reusable governed understanding

Canonical objects:

- `economic_rate_profiles`
- `pricing_rules`
- `operating_playbooks`

Rules:

- Draft knowledge may inform humans but is not automation authority.
- Reusable policy must have explicit lifecycle/governance.
- Historical actuals keep their original evidence even if policy changes later.

### 6. Read & Decision Plane — stable projections over canonical truth

Database views may combine truth for a specific decision or presentation purpose, but they do not own writes.

The frontend rebuild should consume a deliberately small stable contract surface rather than querying dozens of canonical tables ad hoc.

## Canonical-home rules

| Meaning | Canonical home |
| --- | --- |
| Engagement identity + high-level lifecycle state | `engagements` |
| Customer / planner / venue / other people | `parties` + relationship tables |
| Venue / site | `locations` + `engagement_locations` |
| Requirement / constraint / unresolved truth | `engagement_facts` |
| Next action / waiting / blocker | `work_items` |
| Commercial scope / commitment evidence | `commercial_documents` + lines |
| Accepted operating scope | `fulfillment_plans` + lines |
| Timing | `engagement_schedule_items` |
| Person assignment | `engagement_assignments` |
| Resource relevance / configuration | `engagement_resources` |
| Resource hold / reservation / allocation | `resource_commitments` |
| Actual resource use | `resource_usage` |
| Payment transaction evidence | `commercial_payments` |
| Direct job cost | `engagement_cost_items` |
| Delivery learning / outcome | `engagement_closeouts` |
| Reusable labor/resource cost authority | `economic_rate_profiles` |
| Reusable pricing authority | `pricing_rules` |

## Compatibility fields on `engagements`

The following fields are retained for historical/import compatibility and existing projections, but should not be treated as independent writable truth when a canonical domain exists:

- `venue_name`, `venue_address` → canonical venue is `locations` + `engagement_locations`
- `next_action`, `next_action_at`, `next_action_owner_id`, `waiting_on`, `blocked_reason` → canonical movement is `work_items`
- `estimated_value` → commercial/economic evidence should come from commercial documents / financial evidence
- `default_resource_from_date`, `default_resource_through_date`, `default_resource_window_state`, `default_planned_sourcing_model` → engagement-resource and commitment records own specific capacity truth

`customer_request` and `desired_outcome` remain high-level Engagement descriptors for now. Detailed requirements, constraints, assumptions, preferences, and Unknowns belong in `engagement_facts`. Their future promotion/deprecation should be evidence-led rather than assumed.

### Deprecation rule

1. Stop new direct writes in application code.
2. Read canonically first and use compatibility values only as explicit fallback.
3. Observe remaining dependencies.
4. Add DB-level write protection only after application paths are clean.
5. Remove columns only if historical compatibility no longer requires them.

## Economic truth hierarchy

The backend must preserve these distinctions:

- quote / proposal value
- signed / committed revenue
- invoice value
- payment / collection evidence
- direct cost estimate
- direct cost commitment
- direct cost actual
- contribution
- company operating cost
- company cash/account position

`SALE ≠ JOB CONTRIBUTION ≠ COMPANY PROFIT ≠ CASH`.

Current economic views are layered, not competing truths:

- `engagement_cash_position_v` — collection evidence reconciliation
- `engagement_economics_v` — core engagement value/cost/contribution derivation
- `engagement_money_position_v` — commercial document + collection position
- `engagement_economy_v` — enriched engagement economy/read model
- `economy_overview_v` — company-level observed economy summary

For the frontend rebuild, one stable economy contract should be selected per surface rather than consuming all layers directly.

## Authority model

Authorization and intelligence authority are separate.

### App roles

Current supported roles:

- `ADMIN`
- `COMMERCIAL`
- `OPERATIONS`
- `VIEWER`

Current live RLS is primarily membership-gated. This is acceptable for the single-admin current deployment but is **not the final authority model**.

Before adding additional internal users, contractors, clients, or higher-autonomy AI, backend writes should be hardened by domain/risk.

### Target mutation authority

| Domain | ADMIN | COMMERCIAL | OPERATIONS | VIEWER |
| --- | --- | --- | --- | --- |
| Read internal shared reality | yes | yes | yes | yes |
| Relationships / customer facts | yes | yes | bounded | no |
| Quotes / commercial docs | yes | yes | no | no |
| Payment verification | yes | bounded | no | no |
| Pricing policy approval | yes | no | no | no |
| Crew / schedule / delivery work | yes | bounded | yes | no |
| Resource commitments | yes | bounded | yes | no |
| Resource actual usage | yes | no | yes | no |
| Direct cost capture | yes | bounded | yes | no |
| Cost-rate approval | yes | no | no | no |
| Closeout | yes | bounded | yes | no |
| Recovery decisions | yes | bounded | bounded | no |

This table is a target contract; do not enforce it in production until every current command path has been mapped and tested.

## AI / agent boundary

- Intelligence may observe and suggest broadly.
- Reversible internal actions may be allowed only through explicit command contracts.
- Consequential actions require explicit authority and, where appropriate, human approval.
- AI never becomes the sole store for payments, pricing authority, resource commitments, signatures, accepted scope, or deletion.
- Model/provider choice must remain replaceable behind stable proposal/command contracts.

## Stable backend layering for the frontend rebuild

The frontend should not understand all 44 tables.

Target dependency direction:

`Canonical tables → stable read contracts → command functions → UI`

Never:

`UI → random tables + duplicated calculations + hidden business rules`

See `FRONTEND_BACKEND_CONTRACT_V1.md` for the proposed contract surface.

## Hardening order

1. Freeze and document canonical ownership.
2. Stop compatibility-field writes in code.
3. Standardize reads behind stable read contracts.
4. Add backend contract/invariant checks.
5. Add non-breaking role helper functions.
6. Map every mutation to authority level + app role.
7. Tighten RLS domain-by-domain.
8. Rebuild frontend against the stable contracts.
9. Only then remove obsolete compatibility code/views if evidence supports it.

## Non-goals

This hardening pass does **not**:

- rebuild the database;
- move client data into Vlourish;
- replace QuickBooks;
- create a generic ERP;
- add schema for imagined workflows;
- delete historical compatibility data;
- treat frontend structure as backend architecture.

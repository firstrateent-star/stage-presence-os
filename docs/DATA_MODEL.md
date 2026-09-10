# Data Model — v0.7 Operating Backend + Economy + Playbook + Selective Movement

## Center

`engagements` remains the one canonical piece of business through opportunity, commitment, preparation, delivery, closeout and recurrence.

The model is organized around seven durable information domains while preserving this root:

**People → Engagement → Money → Capability → Time/Place → Evidence/Outputs → Learning**

Reusable operating knowledge and selective movement are cross-cutting layers beneath these domains; neither creates a second job object.

Core distinctions are constitutional:
- customer request != technical requirement;
- commercial document != fulfillment plan;
- configured != required != held != reserved != used;
- reusable process knowledge != actual job state;
- derived movement candidate != persisted work item;
- role assignment != step responsibility;
- work item != every possible process step;
- proposal != committed revenue != invoice != collected cash;
- aggregate collection baseline != payment transaction ledger;
- collected cash != current company funds;
- direct job cost != company operating cost;
- operational inventory != asset economic value;
- contribution != accounting profit;
- generated document != canonical business truth;
- historical observation != current authority;
- unknown is legitimate data.

## 1. Identity + access

### `profiles`
Authenticated internal users. Current profile roles remain `ADMIN`, `COMMERCIAL`, `OPERATIONS`, `VIEWER`.

### `app_members`
Explicit internal application allowlist. Current RLS uses `private.is_app_member()`.

### `team_members`
Business-facing contributor identity independent of authentication. Holds username/display identity, member type and primary role. Product surfaces should use this layer instead of hard-coding individuals into system vocabulary.

### `team_member_capabilities`
Evidence-aware contributor capabilities and proficiency (`LEARNING`, `ASSIST`, `INDEPENDENT`, `LEAD`, `EXPERT`, `UNKNOWN`).

### `engagement_access_grants`
Future scoped access seam for client/contributor/observer participation. Current RLS still restricts database access to authenticated active app members. Merely creating a grant does not activate external access.

## 2. People + relationships

### `parties`
A `PERSON` or `ORGANIZATION`. Holds business contact identity and can recur across many Engagements.

### `engagement_parties`
Many-to-many Engagement relationships. Roles include `CUSTOMER`, `PRIMARY_CONTACT`, `BUYER`, `PAYER`, `DECISION_MAKER`, `PLANNER`, `REFERRER`, `VENUE_CONTACT`, `END_USER`, `PRODUCTION_PARTNER`, `VENDOR`, `OTHER`.

### `party_relationships`
Reusable Party-to-Party relationships such as `CONTACT_FOR`, `EMPLOYEE_OF`, `DEPARTMENT_OF`, `REFERS_TO`, `PARTNER_WITH`, `VENDOR_TO`, `RELATED_TO`.

### `relationship_summary_v`
Party-level recurring relationship memory with Engagement frequency and observed revenue/cash/contribution only where supported.

## 3. Engagement + persisted movement

### `engagements`
Canonical business object.

Types: `EVENT`, `LONG_TERM_RENTAL`, `INSTALLATION`, `EQUIPMENT_SALE`, `SERVICE`, `OTHER`.

State remains multidimensional:
- commercial: `NEW`, `DISCOVERY`, `DESIGNING`, `PROPOSED`, `NEGOTIATING`, `WON`, `LOST`;
- commitment: `UNCOMMITTED`, `VERBAL_YES`, `SIGNED`, `DEPOSIT_PENDING`, `CONFIRMED`, `CANCELLED`;
- operational: `NOT_STARTED`, `PLANNING`, `READY`, `ACTIVE`, `COMPLETE`, `CLOSED`;
- attention: `NORMAL`, `NEEDS_ATTENTION`, `WAITING`, `BLOCKED`.

Date-only truth remains supported separately from timestamps.

### `engagement_facts`
Flexible structured truth with category, kind, certainty, provenance and time context.

### `engagement_relationships`
Links related Engagements such as parent programs and component events without merging their identity.

### `work_items`
Durable next movement / continuity records with owner/responsible Party, timing, reason, instructions, success condition, provenance, visibility and origin. A work item can reference `playbook_step_id` and/or `engagement_step_state_id` without turning every Playbook step into a task.

### `daily_work_queue_v`
Open/waiting/blocked persisted work read contract enriched with business-facing owner and responsible Party.

## 4. Selective movement — derived, not persisted

Canonical design: `docs/SELECTIVE_MOVEMENT_ENGINE.md`.

### `engagement_movement_candidates_v`
Deterministic, explainable read model deriving movement candidates from current Engagement reality + reusable Playbook knowledge. Candidate signals carry stable reason/evidence, horizon, materiality, handling, suggested action, equivalent persisted-work coverage and priority.

The view does **not** insert rows. Existing open `work_items` on the same Engagement + Playbook step suppress duplicate attention by marking a candidate `COVERED`.

### `engagement_operating_focus_v`
Read model of uncovered non-LATER movement candidates ordered `NOW → SOON → WATCH → LATER`, then by consequence/materiality/economic context.

Frontend vocabulary:

**Needs You = persisted business work**  
**System Sees = derived model recommendation**

Automatic candidate → work materialization is intentionally not active yet.

## 5. Money

Canonical design: `docs/ECONOMIC_TRANSPARENCY.md`.

Money has four connected layers:

**Engagement economics + company operating costs + asset economics + funds/accounts**

### `engagement_financial_facts`
Evidence-aware aggregate financial facts such as quote total, contract total, amount collected and direct-cost aggregates. Aggregate collection facts act as dated snapshots, not transaction ledgers.

### `commercial_documents`
Quote/invoice/contract/order/credit/receipt truth linked to an Engagement. Supports rental, sale, service, installation and mixed transactions, revision lineage and lifecycle timestamps.

### `commercial_document_lines`
Atomic historical/commercial line reality with Resource reference where earned. Current recovered count is 208. Historical price remains separate from current pricing authority.

### `commercial_payment_schedule`
Deposit/installment/final/balance expectations.

### `commercial_payments`
Observed transaction evidence applied to a commercial document. Supports payment/refund/adjustment semantics, optional receiving financial account, source/certainty and creation provenance.

Rows after a dated aggregate baseline may increment the observed collection position. Older/undated rows are not automatically added on top of an aggregate baseline.

### `engagement_cash_position_v`
Reconciles historical aggregate collection baselines with later payment transactions.

It exposes baseline amount/date/source, later incremental payments, current observed collected amount, evidence as-of date and overlap/reconciliation state.

### `engagement_cost_items`
Directly caused Engagement costs with ESTIMATE / COMMITTED / ACTUAL / CANCELLED state across labor, subcontract, rentals, owned-equipment allocation, logistics/travel, materials/purchases, maintenance, fees, explicitly allocated overhead and other direct costs.

A cost can snapshot the reusable rate actually applied, preserving historical economics when future assumptions change.

### `engagement_economics_v`
Evidence-aware underlying read model for proposal value, committed revenue, collected cash, remaining balance, direct costs and contribution only where supportable. Explicitly unresolved program allocations remain unknown even when a child document contains `$0`.

### `engagement_revenue_sources_v`
Line-level commercial explanation of where the currently selected source document’s value comes from.

### `engagement_money_position_v`
Per-Engagement proposal/commitment/invoice/collection/outstanding position plus commercial source and baseline/payment evidence.

### `engagement_cost_breakdown_v`
Readable direct-cost projection grouped by economic bucket while preserving state, Resource/contributor/vendor/rate links and provenance.

### `engagement_economy_v`
Complete frontend operating-economy contract combining commercial position, cash evidence, revenue source counts, direct-cost evidence and contribution where supportable.

### `economic_rate_profiles`
Versioned/effective-dated reusable internal cost assumptions. Supports DRAFT / APPROVED / RETIRED governance and scopes including Resource, team member, Party/vendor, role, category and general company assumptions.

### `economic_rate_current_v`
Only APPROVED reusable rates effective today. Draft creation does not imply approval or job application.

### `company_cost_items`
Company operating-cost evidence not directly caused by one Engagement: admin labor, software, insurance, facility, vehicle, marketing, professional, license/tax, financing, equipment, maintenance, utilities, office, training and other.

States remain ESTIMATE / COMMITTED / ACTUAL / CANCELLED. Optional links connect costs to Party/vendor, account, Resource and reusable rate profile.

### `company_cost_breakdown_v`
Company-cost projection into people overhead, facilities, technology, insurance/admin, sales/marketing, assets/vehicles, finance/tax and other buckets.

### `financial_accounts`
Identity of bank/cash/credit/loan/other financial accounts. Account identity alone does not imply a balance.

### `financial_account_snapshots`
Append-oriented balance observations. Normalized sign convention: positive = Stage Presence asset/value; negative = liability/obligation.

### `financial_account_current_v`
Latest represented snapshot per active financial account.

### `resource_economic_snapshots`
Append-oriented Resource economic observations: ownership state, represented quantity, acquisition cost, current value estimate, replacement cost, financing balance and annual maintenance estimate.

Operational quantity/capacity/commitment/usage remains separate.

### `resource_economy_current_v`
Latest economic snapshot per Resource.

### `economy_overview_v`
Company-level operating-economy read contract. It combines pipeline/commitment/invoice/collection/outstanding, direct-cost/contribution coverage, company-cost evidence, account/funds evidence and asset-economic evidence while exposing an overall evidence state.

It does **not** promote contribution to company profit.

### `pricing_observations_v`
Historical quoted line evidence vs current Resource reference pricing.

## 6. Capability + fulfillment

### `resources`
Capability/resource library covering physical equipment and services. Carries source identity, category/type, sourcing model, quantity/condition state, reference price and evidence. Existence never implies availability, ownership or asset value.

### `engagement_resources`
Relationship between an Engagement and a Resource. `CONFIGURED` remains neutral evidence and is not a reservation.

### `fulfillment_plans`
What is being prepared/delivered for the Engagement. Types include pull sheet, job plan, assignment sheet and packing list.

### `fulfillment_plan_lines`
Atomic fulfillment items with source grouping, quantity, descriptions/notes, Resource links, timing text and provenance.

### `resource_commitments`
Actual capacity commitment layer, distinct from configuration and fulfillment. Types: `HOLD`, `RESERVATION`, `ALLOCATION`.

### `resource_commitment_current_v`
Current tentative/confirmed commitments enriched with Engagement and Resource context. It does not infer physical availability.

### `resource_usage`
What actually went to/was consumed by the Engagement.

Capacity truth sequence:

**configuration → requirement window → pressure → hold → reservation/allocation → actual usage**

## 7. Time + place

### `engagement_schedule_items`
Execution schedule for event, load-in/out, delivery, pickup, return, setup, show, strike, travel and prep. Supports timestamps, date-only truth and uncertainty; may reference `location_id` and `playbook_step_id`.

### `locations`
Reusable venue/site memory with accumulated access/load-in/parking/power/connectivity knowledge.

### `engagement_locations`
Links an Engagement to locations with role, primary flag, certainty and provenance.

### `location_memory_v`
Reusable location history and accumulated operating knowledge.

## 8. Evidence + representations

### `source_artifacts`
Original evidence/provenance: photo, voice, text, import, email reference, document and other.

### `source_artifact_segments`
Engagement/project/document/page-level provenance inside larger source artifacts.

### `events`
Append-oriented activity/evidence ledger.

### `engagement_outputs`
Versioned generated or approved representations of canonical truth including quote, invoice, contract, job brief, assignment sheet, pull sheet, packing list, client summary, install scope, service report and closeout report.

Generated outputs remain representations rather than canonical business truth.

## 9. Reusable operating knowledge

Canonical design: `docs/JOB_LIFECYCLE_PLAYBOOK.md`.

### `operating_playbooks`
Versioned process-knowledge families. Current active seed: `STAGE_PRESENCE_CORE_LIFECYCLE` v1.

### `operating_playbook_steps`
Reusable start-to-finish lifecycle knowledge with phase/order, requiredness, automation mode, role/capability hint, applicable Engagement types, client touchpoint, procedure depth, completion/evidence/risk/dependencies and tags.

Current seed: 105 steps across 13 phases.

### `engagement_step_states`
Optional per-Engagement process truth. Missing state means knowledge exists without a job-state claim.

### `playbook_catalog_v`
Internal browsable read model of active reusable process knowledge.

### `engagement_job_map_v`
Applicable Playbook path overlaid with actual persisted state/responsibility. Missing state becomes `UNTRACKED`, not overdue/incomplete.

## 10. Contributors + assignment depth

### `engagement_assignments`
Role-level contributor assignment answering: **who is this person on this job?**

### `engagement_step_assignments`
Granular responsibility mapping (`LEAD`, `SUPPORT`, `APPROVER`, `CONSULTED`, `INFORMED`) answering: **what specifically do they own/support/approve?**

### `assignment_brief_v`
Contributor briefing read model combining job role, schedule/location, scope/acceptance and lifecycle responsibilities.

### `contributor_work_v`
Contributor-oriented projection of assignments and open work.

## 11. Learning

### `engagement_closeouts`
One learning closeout per Engagement including outcome, timing, solution/venue learning, recurrence, next-time improvement, client feedback, audience/end-user experience and reliability notes.

### `learning_review_signals`
Derived review signals for recurring patterns and learning.

Process learning may become a candidate Playbook improvement; one job does not automatically rewrite company procedure.

## 12. Frontend contracts

Primary:
- `engagement_frontend_v`
- `engagement_workspace_v`
- `engagement_client_surface_v`

Operating attention:
- `daily_work_queue_v`
- `engagement_movement_candidates_v`
- `engagement_operating_focus_v`

Money:
- `engagement_revenue_sources_v`
- `engagement_cash_position_v`
- `engagement_money_position_v`
- `engagement_cost_breakdown_v`
- `engagement_economy_v`
- `economy_overview_v`
- `financial_account_current_v`
- `company_cost_breakdown_v`
- `resource_economy_current_v`
- `economic_rate_current_v`

Process/assignment:
- `playbook_catalog_v`
- `engagement_job_map_v`
- `assignment_brief_v`

Other:
- `relationship_summary_v`
- `location_memory_v`
- `resource_commitment_current_v`
- `capacity_pressure_signals`
- `fulfillment_plan_current_v`
- `pricing_observations_v`
- `learning_review_signals`

## Security + scale posture

All current app tables in the exposed schema use RLS behind the authenticated active-member boundary. Browser-facing derived views use `security_invoker=true`. Anonymous Data API privileges are explicitly revoked.

The model provides clean places for future automation, client participation, documents, costs, payments, account evidence, asset economics, reservations, usage, process knowledge, assignment depth and movement derivation without claiming those realities exist before evidence supports them.

Scaling objective:

> **Know the whole operating path, activate only what reality earns, show each contributor only what helps them contribute, automate continuity rather than judgment, and let each result improve the next Engagement.**

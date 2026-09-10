# Data Model — v0.6 Operating Backend + Playbook + Selective Movement

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
- revenue != cash != contribution;
- generated document != canonical business truth;
- historical observation != current authority;
- unknown is legitimate data.

## 1. Identity + access

### `profiles`
Authenticated internal users. Current profile roles remain `ADMIN`, `COMMERCIAL`, `OPERATIONS`, `VIEWER`.

### `app_members`
Explicit internal application allowlist. Current RLS uses `private.is_app_member()`.

### `team_members`
Business-facing contributor identity independent of authentication. Holds username/display identity, member type and primary role. New product surfaces should use this layer instead of hard-coding individual founders/employees into system vocabulary.

### `team_member_capabilities`
Evidence-aware contributor capabilities and proficiency (`LEARNING`, `ASSIST`, `INDEPENDENT`, `LEAD`, `EXPERT`, `UNKNOWN`).

### `engagement_access_grants`
Future scoped access seam for client/contributor/observer participation. Current RLS still restricts database access to authenticated active app members. Merely creating a grant does not activate external access.

## 2. People + relationships

### `parties`
A `PERSON` or `ORGANIZATION`. Holds business contact identity and can recur across many Engagements.

### `engagement_parties`
Many-to-many Engagement relationships. Roles include:
`CUSTOMER`, `PRIMARY_CONTACT`, `BUYER`, `PAYER`, `DECISION_MAKER`, `PLANNER`, `REFERRER`, `VENUE_CONTACT`, `END_USER`, `PRODUCTION_PARTNER`, `VENDOR`, `OTHER`.

The buyer, payer, planner, venue, referrer and people experiencing the outcome can therefore be different realities.

### `party_relationships`
Reusable Party-to-Party relationships such as `CONTACT_FOR`, `EMPLOYEE_OF`, `DEPARTMENT_OF`, `REFERS_TO`, `PARTNER_WITH`, `VENDOR_TO`, `RELATED_TO`.

### `relationship_summary_v`
Party-level recurring relationship memory with Engagement frequency and observed revenue/cash/contribution only where supported.

## 3. Engagement + persisted movement

### `engagements`
Canonical business object.

Types:
`EVENT`, `LONG_TERM_RENTAL`, `INSTALLATION`, `EQUIPMENT_SALE`, `SERVICE`, `OTHER`.

State remains multidimensional:
- commercial: `NEW`, `DISCOVERY`, `DESIGNING`, `PROPOSED`, `NEGOTIATING`, `WON`, `LOST`;
- commitment: `UNCOMMITTED`, `VERBAL_YES`, `SIGNED`, `DEPOSIT_PENDING`, `CONFIRMED`, `CANCELLED`;
- operational: `NOT_STARTED`, `PLANNING`, `READY`, `ACTIVE`, `COMPLETE`, `CLOSED`;
- attention: `NORMAL`, `NEEDS_ATTENTION`, `WAITING`, `BLOCKED`.

Date-only truth remains supported separately from timestamps.

### `engagement_facts`
Flexible structured truth with category, kind, certainty, provenance and time context.

Categories include:
`EVENT`, `VISUAL`, `AUDIO`, `LIGHTING`, `STAGING`, `POWER`, `NETWORK`, `VENUE`, `LOGISTICS`, `LABOR`, `CONTENT`, `CUSTOMER`, `COMMERCIAL`, `EXPERIENCE`, `SAFETY`, `ACCESS`, `OTHER`.

Kinds include:
`REQUIREMENT`, `CONSTRAINT`, `CUSTOMER_REQUEST`, `OBSERVATION`, `ASSUMPTION`, `PREFERENCE`, `OUTCOME`, `OTHER`.

### `engagement_relationships`
Links related Engagements such as parent programs and component events without merging their identity.

### `work_items`
Durable next movement / continuity records. Can hold internal owner, external responsible Party, due/trigger, reason, instructions, success condition, next-step hint, certainty, provenance, visibility (`INTERNAL`, `SHARED`, `CLIENT`) and origin (`MANUAL`, `SYSTEM`, `AUTOMATION`, `IMPORT`, `CLIENT`, `OTHER`).

A work item can reference `playbook_step_id` and/or `engagement_step_state_id`. This gives an action process context without turning every Playbook step into a task.

### `daily_work_queue_v`
Open/waiting/blocked persisted work read contract enriched with business-facing owner and responsible Party.

## 4. Selective movement — derived, not persisted

Canonical design: `docs/SELECTIVE_MOVEMENT_ENGINE.md`.

### `engagement_movement_candidates_v`
Deterministic, explainable read model deriving movement candidates from current Engagement reality + reusable Playbook knowledge.

A candidate includes:
- deterministic `candidate_key`;
- Engagement + Playbook step context;
- movement class and focus domain;
- reason code + `why_now`;
- materiality and urgency;
- recommended handling (`SYSTEM`, `ASSISTED`, `HUMAN`);
- suggested work/action type;
- whether persistence is likely warranted;
- defensible due-date hint only where supported;
- certainty + JSONB evidence basis;
- represented economic value where relevant;
- equivalent open-work count;
- `COVERED` / `UNMATERIALIZED` continuity state;
- priority score.

Current deterministic signal families cover open proposal decisions, open demand needing scope, commitment handoff, imminent schedule/crew/site reconciliation, represented balance verification, final readiness, recent closeout learning and resource-window pressure.

The view does **not** insert rows. A candidate is not proof the Playbook step is required and is not a work item.

Existing open `work_items` on the same Engagement + Playbook step suppress duplicate attention by marking a candidate `COVERED`.

### `engagement_operating_focus_v`
Read model of uncovered non-LATER movement candidates.

Ordering constitution:
1. urgency horizon: `NOW → SOON → WATCH → LATER`;
2. priority/consequence inside the horizon;
3. event timing and stable tie-breakers.

This lets future capacity risk remain visible without displacing an imminent delivery issue merely because its abstract score is high.

Frontend vocabulary:

**Needs You = persisted business work**  
**System Sees = derived model recommendation**

Automatic candidate → work materialization is intentionally not active yet.

## 5. Money

### `engagement_financial_facts`
Evidence-aware aggregate financial facts such as quote total, contract total, amount collected and direct-cost aggregates.

### `commercial_documents`
Quote/invoice/contract/order/credit/receipt truth linked to an Engagement. Supports rental, sale, service, installation and mixed transactions, plus revision lineage/lifecycle timestamps.

### `commercial_document_lines`
Atomic historical/commercial line reality, including Resource reference where earned. Historical price remains separate from current Resource reference price.

### `commercial_payment_schedule`
Deposit/installment/final/balance expectations.

### `commercial_payments`
Observed payment evidence and application to commercial documents.

### `engagement_cost_items`
Directly caused Engagement costs with estimate/committed/actual/cancelled state across labor, subcontract, equipment rental, transport, travel, lodging, per diem, fuel, materials, purchases, fees and other costs.

### `engagement_economics_v`
Evidence-aware read model for proposal value, committed revenue, collected cash, remaining balance, direct costs and contribution only where supportable. Explicitly unresolved program allocations remain unknown even when a component document contains `$0`.

### `pricing_observations_v`
Historical quoted line evidence vs current Resource reference pricing.

## 6. Capability + fulfillment

### `resources`
Capability/resource library covering physical equipment and services. Carries source identity, category/type, sourcing model, quantity/condition state, reference price and price authority/evidence. Existence never implies availability.

### `engagement_resources`
Relationship between an Engagement and a Resource. `CONFIGURED` remains neutral evidence and is not a reservation.

### `fulfillment_plans`
What is being prepared/delivered for the Engagement. Types include pull sheet, job plan, assignment sheet and packing list.

### `fulfillment_plan_lines`
Atomic fulfillment items with source grouping, quantity, descriptions/notes, resource links, timing text and provenance.

### `resource_commitments`
Actual capacity commitment layer, distinct from configuration and fulfillment. Types: `HOLD`, `RESERVATION`, `ALLOCATION`.

### `resource_commitment_current_v`
Current tentative/confirmed commitments enriched with Engagement and Resource context. It does not infer physical availability.

### `resource_usage`
What actually went to/was consumed by the Engagement.

Capacity truth sequence:

**configuration → requirement window → pressure → hold → reservation/allocation → actual usage**

Selective Movement may surface capacity pressure, but it cannot turn pressure into commitment or usage.

## 7. Time + place

### `engagement_schedule_items`
Execution schedule for event, load-in/out, delivery, pickup, return, setup, show, strike, travel and prep. Supports exact timestamps, date-only truth and uncertainty. A schedule item may reference a `location_id` and a `playbook_step_id`.

### `locations`
Reusable venue/site memory for venue, warehouse, office, install site, customer site and other locations, with accumulated access/load-in/parking/power/connectivity knowledge.

### `engagement_locations`
Links an Engagement to one or more locations with role, primary flag, certainty and provenance.

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
Versioned generated or approved representations of canonical truth:
`QUOTE`, `INVOICE`, `CONTRACT`, `JOB_BRIEF`, `ASSIGNMENT_SHEET`, `PULL_SHEET`, `PACKING_LIST`, `CLIENT_SUMMARY`, `INSTALL_SCOPE`, `SERVICE_REPORT`, `CLOSEOUT_REPORT`, `OTHER`.

Outputs may reference the Playbook step that produced or governs them, but they remain representations rather than canonical truth.

## 9. Reusable operating knowledge

Canonical design: `docs/JOB_LIFECYCLE_PLAYBOOK.md`.

### `operating_playbooks`
Versioned process-knowledge families. Current active seed:
`STAGE_PRESENCE_CORE_LIFECYCLE` v1.

### `operating_playbook_steps`
Reusable start-to-finish lifecycle knowledge. Each step can carry:
- phase/order/code/title;
- CORE / CONDITIONAL / OPTIONAL requiredness;
- SYSTEM / ASSISTED / HUMAN automation mode;
- default role/capability;
- applicable Engagement types;
- applicability condition;
- client-touchpoint flag;
- procedure depth (`MAP_ONLY`, `CHECKLIST`, `SOP`, `VERIFIED_SOP`);
- instruction/completion/evidence/risk guidance;
- dependencies, inputs, outputs and tags.

The current v1 seed has 105 steps across 13 phases and covers universal flow plus EVENT, LONG_TERM_RENTAL, INSTALLATION, EQUIPMENT_SALE and SERVICE branches.

A Playbook step is reusable knowledge only. It is not evidence that a specific Engagement requires or completed that step.

### `engagement_step_states`
Optional per-Engagement process truth. Rows are created only when explicit tracking is useful/earned.

Statuses:
`NOT_STARTED`, `READY`, `ACTIVE`, `WAITING`, `BLOCKED`, `DONE`, `SKIPPED`, `NOT_APPLICABLE`.

Requirement states:
`REQUIRED`, `CONDITIONAL`, `OPTIONAL`, `NOT_APPLICABLE`, `UNKNOWN`.

Also holds owner/responsible Party, timing, completion/evidence notes, certainty and provenance.

### `playbook_catalog_v`
Internal browsable read model of active reusable process knowledge.

### `engagement_job_map_v`
Crosses one active Engagement with applicable Playbook steps and overlays actual persisted step state/responsibility where it exists. Missing persisted state becomes `UNTRACKED`, meaning **knowledge is available but no job-state claim has been made**.

## 10. Contributors + assignment depth

### `engagement_assignments`
Role-level contributor assignment. In addition to role/state/schedule/provenance it can hold:
- `scope_summary`;
- `briefing_notes`;
- `acceptance_criteria`;
- `acknowledgement_state` / `acknowledged_at`;
- `location_id`;
- `schedule_item_id`.

The assignment answers: **who is this person on this job?**

### `engagement_step_assignments`
Granular responsibility mapping between an Engagement assignment and a Playbook step.

Responsibility types:
`LEAD`, `SUPPORT`, `APPROVER`, `CONSULTED`, `INFORMED`.

This answers: **what specifically do they own/support/approve?**

### `assignment_brief_v`
Contributor briefing read model combining job role, schedule/location, scope/acceptance and ordered lifecycle responsibilities.

### `contributor_work_v`
Contributor-oriented projection of assignments and open work using business-facing username/display identity.

## 11. Learning

### `engagement_closeouts`
One learning closeout per Engagement, including outcome, optional setup/strike time, solution/venue learning, recurrence, next-time improvement, generic founder-dependent minutes, client feedback, audience/end-user experience and reliability notes.

### `learning_review_signals`
Derived review signals for recurring patterns and learning.

Process learning can become a candidate Playbook improvement, but one job does not automatically rewrite company procedure. Promotion toward detailed SOP/VERIFIED_SOP requires appropriate qualified evidence/review.

## 12. Frontend contracts

The frontend consumes stable business read models instead of reconstructing the relational graph independently on every screen.

Primary:
- `engagement_frontend_v`
- `engagement_workspace_v`
- `engagement_client_surface_v`

Operating attention:
- `daily_work_queue_v` — persisted action reality
- `engagement_movement_candidates_v` — explainable derived movement
- `engagement_operating_focus_v` — selective uncovered attention

Process/assignment:
- `playbook_catalog_v`
- `engagement_job_map_v`
- `assignment_brief_v`

Other:
- `engagement_economics_v`
- `contributor_work_v`
- `relationship_summary_v`
- `location_memory_v`
- `resource_commitment_current_v`
- `capacity_pressure_signals`
- `fulfillment_plan_current_v`
- `pricing_observations_v`
- `learning_review_signals`

## Security + scale posture

All current app tables are behind the authenticated active-member RLS boundary. Frontend/derived views use `security_invoker=true`. Anonymous Data API privileges are explicitly revoked.

The model deliberately has clean places for future automation, client participation, documents, costs, reservations, usage, process knowledge, assignment depth and movement derivation without claiming those realities exist before evidence supports them.

The scaling objective remains:

> **Know the whole operating path, activate only what reality earns, show each contributor only what helps them contribute, automate continuity rather than judgment, and let each result improve the next Engagement.**

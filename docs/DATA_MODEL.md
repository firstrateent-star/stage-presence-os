# Data Model — v0.4 Operating Backend

## Center

`engagements` remains the one canonical piece of business through opportunity, commitment, preparation, delivery, closeout and recurrence.

The model is organized around seven durable information domains while preserving this root:

**People → Engagement → Money → Capability → Time/Place → Evidence/Outputs → Learning**

These are not separate applications. They are related truths about the same business organism.

Core distinctions are constitutional:
- customer request != technical requirement;
- commercial document != fulfillment plan;
- configured != required != held != reserved != used;
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
Future scoped access seam for client/contributor/observer participation. Records can express commercial/operations/upload/approval permissions, but current RLS still restricts database access to authenticated active app members. Merely creating a grant does not activate external access.

## 2. People + relationships

### `parties`
A `PERSON` or `ORGANIZATION`. Holds business contact identity and can recur across many Engagements.

### `engagement_parties`
Many-to-many Engagement relationships. Roles include:
`CUSTOMER`, `PRIMARY_CONTACT`, `BUYER`, `PAYER`, `DECISION_MAKER`, `PLANNER`, `REFERRER`, `VENUE_CONTACT`, `END_USER`, `PRODUCTION_PARTNER`, `VENDOR`, `OTHER`.

This allows the buyer, payer, planner, venue, referrer and people experiencing the outcome to be different realities.

### `party_relationships`
Reusable Party-to-Party relationships such as `CONTACT_FOR`, `EMPLOYEE_OF`, `DEPARTMENT_OF`, `REFERS_TO`, `PARTNER_WITH`, `VENDOR_TO`, `RELATED_TO`.

### `relationship_summary_v`
Party-level recurring relationship memory with Engagement frequency and observed revenue/cash/contribution only where supported.

## 3. Engagement

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

Categories now include:
`EVENT`, `VISUAL`, `AUDIO`, `LIGHTING`, `STAGING`, `POWER`, `NETWORK`, `VENUE`, `LOGISTICS`, `LABOR`, `CONTENT`, `CUSTOMER`, `COMMERCIAL`, `EXPERIENCE`, `SAFETY`, `ACCESS`, `OTHER`.

Kinds include:
`REQUIREMENT`, `CONSTRAINT`, `CUSTOMER_REQUEST`, `OBSERVATION`, `ASSUMPTION`, `PREFERENCE`, `OUTCOME`, `OTHER`.

### `engagement_relationships`
Links related Engagements such as parent programs and component events without merging their identity.

### `work_items`
Durable next movement / continuity records. Can hold internal owner, external responsible Party, due/trigger, reason, instructions, success condition, next-step hint, certainty, provenance, visibility (`INTERNAL`, `SHARED`, `CLIENT`) and origin (`MANUAL`, `SYSTEM`, `AUTOMATION`, `IMPORT`, `CLIENT`, `OTHER`).

### `daily_work_queue_v`
Open/waiting/blocked work read contract enriched with business-facing owner and responsible Party.

## 4. Money

### `engagement_financial_facts`
Evidence-aware aggregate financial facts such as quote total, contract total, amount collected and direct-cost aggregates.

### `commercial_documents`
Quote/invoice/contract/order/credit/receipt truth linked to an Engagement. Supports rental, sale, service, installation and mixed transactions.

Now includes revision/lifecycle support:
- `version_no`;
- `supersedes_document_id`;
- `issued_at`;
- `sent_at`;
- `accepted_at`;
- `valid_through`;
- `client_visible`.

### `commercial_document_lines`
Atomic historical/commercial line reality, including resource reference where earned. Historical price remains separate from current Resource reference price.

### `commercial_payment_schedule`
Deposit/installment/final/balance expectations.

### `commercial_payments`
Observed payment evidence and application to commercial documents.

### `engagement_cost_items`
Directly caused Engagement costs. Supports estimate/committed/actual/cancelled state across labor, subcontract, equipment rental, transport, travel, lodging, per diem, fuel, materials, purchases, fees and other costs.

This is not a replacement for the general ledger. It exists so the OS can reason about the economics of an Engagement without pretending partial cost evidence is complete accounting.

### `engagement_economics_v`
Evidence-aware read model for:
- proposal value;
- committed revenue;
- collected cash;
- remaining balance;
- estimated/committed/actual direct cost;
- projected/observed contribution when supportable;
- explicit value/cost evidence basis.

Program allocations explicitly known to be unknown remain unknown even when a child source document literally contains `$0`.

### `pricing_observations_v`
Historical quoted line evidence vs current Resource reference pricing.

## 5. Capability + fulfillment

### `resources`
Capability/resource library covering physical equipment and services. Carries source identity, category/type, sourcing model, quantity/condition state, reference price and price authority/evidence.

Existence never implies availability.

### `engagement_resources`
Relationship between an Engagement and a Resource. `CONFIGURED` remains neutral evidence and is not a reservation.

### `fulfillment_plans`
What is being prepared/delivered for the Engagement. Types include pull sheet, job plan, assignment sheet and packing list.

### `fulfillment_plan_lines`
Atomic fulfillment items with source grouping, quantity, descriptions/notes, resource links, timing text and provenance.

### `resource_commitments`
Actual capacity commitment layer, distinct from configuration and fulfillment. Types: `HOLD`, `RESERVATION`, `ALLOCATION`. Includes state, quantity, window, sourcing and certainty.

### `resource_commitment_current_v`
Current tentative/confirmed commitments enriched with Engagement and Resource context. It does not infer physical availability.

### `resource_usage`
What actually went to/was consumed by the Engagement. May reference a prior commitment and/or fulfillment line but remains separate truth.

Capacity truth sequence:

**configuration → requirement window → pressure → hold → reservation/allocation → actual usage**

Skipping a step must never be inferred merely for software convenience.

## 6. Time + place

### `engagement_schedule_items`
Execution schedule for event, load-in/out, delivery, pickup, return, setup, show, strike, travel and prep. Supports exact timestamps, date-only truth and uncertainty.

May now reference a canonical `location_id` while retaining source literal location text.

### `locations`
Reusable venue/site memory. Supports venue, warehouse, office, install site, customer site and other locations with address plus accumulated access/load-in/parking/power/connectivity knowledge.

### `engagement_locations`
Links an Engagement to one or more locations with role, primary flag, certainty and provenance.

### `location_memory_v`
Reusable location history: Engagement count, recurrence dates/current work and accumulated operating knowledge.

Existing Engagement venue fields have been promoted into canonical Locations only by exact text matching; fuzzy entity resolution remains unearned.

## 7. Evidence + representations

### `source_artifacts`
Original evidence/provenance. Types include photo, voice, text, import, email reference, document and other.

### `source_artifact_segments`
Engagement/project/document/page-level provenance inside larger source artifacts.

### `events`
Append-oriented activity/evidence ledger.

### `engagement_outputs`
Versioned generated or approved representations of canonical truth:
`QUOTE`, `INVOICE`, `CONTRACT`, `JOB_BRIEF`, `ASSIGNMENT_SHEET`, `PULL_SHEET`, `PACKING_LIST`, `CLIENT_SUMMARY`, `INSTALL_SCOPE`, `SERVICE_REPORT`, `CLOSEOUT_REPORT`, `OTHER`.

States:
`DRAFT`, `GENERATED`, `REVIEWED`, `APPROVED`, `SENT`, `SUPERSEDED`, `VOID`.

Outputs may have content/payload/storage metadata and client visibility, but they do not replace the structured truth from which they were generated.

## 8. Contributors + execution

### `engagement_assignments`
People assigned to an Engagement, with role, requested/confirmed/declined/completed state, scheduling and provenance.

### `contributor_work_v`
Contributor-oriented projection of assignments and open work using business-facing username/display identity.

## 9. Learning

### `engagement_closeouts`
One learning closeout per Engagement. Captures broad outcome and optional setup/strike time, solution/venue learning, recurrence, next-time improvement and generic `founder_dependent_minutes`.

The legacy `greg_minutes` column is retained only for compatibility; new product surfaces should use `founder_dependent_minutes`.

Closeout can also preserve:
- client feedback;
- audience/end-user experience;
- reliability notes.

### `learning_review_signals`
Derived review signals for recurring patterns and learning.

## 10. Frontend contracts

The frontend should consume stable business read models instead of reconstructing the relational graph independently on every screen.

### `engagement_frontend_v`
Lightweight one-row-per-active-Engagement surface for Today/Work/list/dashboard screens. Includes customer, current commercial position, economics, next work, counts, next schedule, capacity signal and evidence count.

### `engagement_workspace_v`
Complete internal single-Engagement workspace. One filtered read can expose core state plus parties, facts, configured resources, commercial docs/lines/payments, fulfillment, schedule, assignments, work, costs, commitments, usage, outputs, locations, relationships, evidence and closeout.

Unearned data is represented as null/empty collections rather than fabricated completeness.

### `engagement_client_surface_v`
Curated future client-facing projection. Excludes internal cost/evidence/internal-work detail and only includes records marked client/shared. It is still internal-member-only today; external portal authorization has not been activated.

### Other read contracts
- `engagement_economics_v`
- `daily_work_queue_v`
- `contributor_work_v`
- `relationship_summary_v`
- `location_memory_v`
- `resource_commitment_current_v`
- `capacity_pressure_signals`
- `fulfillment_plan_current_v`
- `pricing_observations_v`
- `learning_review_signals`

## Security + scale posture

All current app tables are behind the authenticated active-member RLS boundary. Frontend views are `security_invoker=true`. Anonymous Data API privileges are explicitly revoked.

Indexes cover primary operating access paths and foreign-key relationships surfaced by the Supabase advisor. The fact that newly created indexes are initially reported as unused is expected until real traffic exercises them.

The model deliberately has clean places for future automation, client participation, documents, costs, reservations and usage without claiming those realities exist before evidence supports them.

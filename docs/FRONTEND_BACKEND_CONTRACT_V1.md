# Stage Presence OS — Frontend / Backend Contract v1

Status: Candidate contract for the frontend rebuild.

## Principle

The rebuilt frontend should be a **selective projection of Shared Business Reality**, not another place where business meaning is reconstructed.

Backend complexity should reduce human cognitive load.

## Read contracts

The frontend should converge on a small set of read contracts. Existing views may serve these contracts initially; names can be improved later without forcing a data-model rewrite.

### 1. Today / Attention

Purpose: answer **What needs my attention now, and why?**

Primary sources:

- `daily_work_queue_v`
- `engagement_operating_focus_v`
- `engagement_movement_candidates_v` where needed

Frontend should not recompute priority from raw tables.

### 2. Engagement List / Summary

Purpose: browse active work and understand commercial/operating position quickly.

Initial contract:

- `engagement_frontend_v`

Long-term naming candidate: `engagement_summary_v`.

Compatibility values such as legacy venue or next-action fields must not be assumed canonical merely because they appear in this view.

### 3. Engagement Workspace / Detail

Purpose: assemble the internal business aggregate for one Engagement.

Initial contract:

- `engagement_workspace_v`

This is the broad internal read model. The UI may render only the role-relevant subset.

Writes must still go through owning domain commands; a workspace projection is never a writable aggregate blob.

### 4. Relationships

Purpose: answer **Who are we working with, what history exists, and what value/recurrence is represented?**

Primary contract:

- `relationship_summary_v`

Detailed relationship history may use canonical party/engagement relationships behind a repository/service boundary.

### 5. Capability

Purpose: answer **What can Stage Presence deliver, how is it sourced, what is committed/used, and what economic evidence exists?**

Primary sources:

- resources / team capability read service
- `resource_commitment_current_v`
- `resource_economy_current_v`
- resource usage read service

A later `capability_summary_v` may be earned if repeated frontend joins remain duplicated.

### 6. Economy

Purpose: answer decision questions about commercial value, collections, direct cost, contribution, company economy and evidence coverage.

Preferred stable layers:

- engagement detail: `engagement_economy_v`
- company overview: `economy_overview_v`
- evidence coverage: `economy_reality_coverage_v`

The frontend should not consume `engagement_cash_position_v`, `engagement_economics_v`, and `engagement_money_position_v` independently unless implementing an explicit diagnostic surface. Those are backend derivation layers.

### 7. Recovery / Reality Health

Purpose: answer **Where is the model weak, and which gaps actually deserve attention?**

Primary contract:

- `recovery_queue_v`
- Reality Health repository/read model

Reality Health is observability. Recovery is actionable review. Neither should be treated as canonical business state.

### 8. Client Surface

Purpose: expose only explicitly client-safe reality.

Primary contract:

- `engagement_client_surface_v`
- `engagement_access_grants`

Internal workspace projections must never be reused as a client API merely by hiding components in the browser.

## Command contracts

Frontend mutations should converge on named domain commands rather than direct `.from(table).insert/update` scattered through components.

Target command families:

### Engagement

- create Engagement identity
- transition commercial state
- transition commitment state
- transition operational state
- archive Engagement

### Reality intake

- preserve source
- create/update Fact
- track Unknown
- link Party
- link Location

### Work

- create Work
- update Work
- complete/cancel Work
- set waiting/blocker through Work semantics

### Commercial

- create/version commercial document
- record payment evidence
- verify collection provenance

### Fulfillment / delivery

- activate fulfillment plan
- create schedule item
- assign contributor
- commit resource
- record resource usage
- close out delivery

### Economics / policy

- record direct cost
- create draft rate
- approve/retire rate
- create draft pricing rule
- approve/retire pricing rule

## Frontend anti-patterns to remove during rebuild

- direct queries to many canonical tables from one component;
- calculations in React that define business meaning;
- direct mutation of compatibility fields on `engagements`;
- treating a configured Resource as reserved;
- treating a proposed person as confirmed crew;
- treating a payment report as verified accounting evidence;
- treating absence of data as absence of activity;
- role-based visual hiding as the only security control;
- client-safe behavior implemented only through frontend filtering.

## Presentation architecture

Recommended product surfaces after backend hardening:

1. **Today** — selective role-aware attention
2. **Capture** — global reality intake / new opportunity
3. **Work** — explicit obligations and ownership
4. **Engagements** — business/work lifecycle
5. **Relationships** — recurring value network
6. **Capability** — assets + people + sourcing + capacity
7. **Economy** — revenue/cost/collections/contribution evidence
8. **Recovery** — internal observability and exceptions

Playbook, system health, methodology/evaluation, and admin/governance should be secondary/system surfaces rather than everyday primary navigation unless actual usage earns otherwise.

## Engagement page principle

The Engagement page should tell one coherent story rather than mirror tables:

1. Why this Engagement exists / desired outcome
2. Customer + relationship context
3. Commercial position
4. Current solution / accepted fulfillment
5. Operating reality: where / when / who / capacity
6. What must happen next
7. Delivery readiness / Job Day when relevant
8. Actuals + economics after delivery
9. Closeout / learning / recurrence
10. Evidence / history on demand

The page may read a large workspace contract, but it should reveal complexity progressively.

## Rebuild rule

Do not start the visual rewrite until:

- canonical ownership is documented;
- compatibility-field writes are frozen;
- stable read contracts are chosen;
- command paths are mapped;
- authority expectations are documented;
- backend contract checks are green.

Then the frontend may be substantially redesigned without destabilizing business truth.

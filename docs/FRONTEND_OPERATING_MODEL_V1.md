# Stage Presence Frontend Operating Model v1

## Center

The frontend is not a visual representation of the database.

It is a selective operating surface over Stage Presence reality.

> Backend depth should reduce the cognitive burden placed on the human.

The rebuilt frontend therefore starts from human questions, not tables or historical screens.

## Primary navigation

### Today
Question: **What deserves my attention now?**

Today combines upcoming delivery, Engagements already carrying attention/work, and only the highest-leverage reality gaps. Role changes emphasis; it does not change canonical truth or infer ownership.

### Engagements
Question: **What work is Stage Presence pursuing, committed to, preparing, delivering, or learning from?**

The index consumes `engagement_summary_v` through `listEngagementSummaries()`.

It does not reconstruct customer, venue, next Work, economy, assignments, or commitments in React.

### Relationships
Question: **Who are we creating value with over time?**

This is relationship memory, not a contact list. It emphasizes recurrence and represented commercial history.

### Capability
Question: **What can Stage Presence actually deliver?**

Capability distinguishes:

- `PHYSICAL_CAPACITY`
- `SERVICE`
- `LOGISTICS`
- `COMMERCIAL_ADJUSTMENT`
- `OTHER`

The UI must not treat every Resource identity as reservable inventory.

### Economy
Question: **What economic reality is supported by evidence?**

Revenue, collections, costs, contribution, company funds, and asset economics remain distinct.

Missing cost evidence is never displayed as zero cost.

### Recovery + Health
Question: **Where is Stage Presence's model of reality weak, conflicting, or decision-relevant?**

Recovery is a system/admin observability surface, not the primary operating experience.

## Engagement detail

An Engagement is presented as one progressively revealed operating story:

1. **Reality Intake** — what changed?
2. **Business Story** — why / who / what
3. **Movement** — what needs to happen next?
4. **Commercial + Economics** — money
5. **Fulfillment** — how / where / when / who
6. **Actuals** — what actually happened?
7. **Learning** — what should Stage Presence carry forward?

Existing canonical command components may survive the rebuild where they still respect this sequence and the Backend Constitution.

## Backend contract boundary

Index-level frontend surfaces depend on `src/lib/readContracts.ts`, not raw joins:

- `listEngagementSummaries()`
- `listRelationshipSummaries()`
- `listCapabilities()`
- `getEconomyOverview()`
- `listRecoveryQueue()`

React components must not mutate Supabase business tables directly.

Commands remain behind repository/command modules.

## Progressive cutover

The frontend rebuild is intentionally progressive.

Stable new read contracts replace old index/read composition first. Proven Engagement command components are re-composed rather than discarded merely for visual consistency.

A legacy component should be retired when:

1. its purpose is duplicated by a stable contract-driven surface;
2. it exposes backend complexity with no human decision value;
3. it encourages duplicate truth or a deprecated write path; or
4. its functionality has been safely moved behind the new operating model.

## Mobile principle

Mobile surfaces optimize for immediate operation:

- Today
- Engagements
- Relationships
- Capability
- Economy
- contextual Capture

System observability such as Recovery remains available but does not consume primary mobile navigation space.

## Design language

- calm, dark operational environment;
- strong hierarchy, low decoration;
- amber is an action/brand signal, not a universal status color;
- cards represent human decisions or coherent business objects, not every database entity;
- missing evidence is stated explicitly;
- progressive disclosure is preferred over long ERP-style forms;
- wording uses business language before system/database language.

## Evidence gate

Frontend v1 is not complete because it compiles.

It must be observed in actual Stage Presence operation. We should track:

- whether Today reduces searching;
- whether Engagement detail makes the operating story easier to understand;
- whether contextual Capture gets used;
- whether users still fall back to Recovery or raw details for routine work;
- which legacy controls remain essential;
- where stable read contracts prove insufficient.

Schema changes are not earned by visual preference. A repeated contract failure must be observed first.

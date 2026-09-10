# Stage Presence OS — Job Lifecycle Playbook

**Status:** Active architecture and operating-knowledge boundary  
**Date:** 2026-09-10  
**Playbook:** `STAGE_PRESENCE_CORE_LIFECYCLE` v1

## Purpose

Stage Presence needs to know more than who is assigned to a job. It needs durable knowledge of what can go into producing an Engagement from first customer intent through delivery, economic close, learning and recurrence.

The system therefore separates **reusable process knowledge** from **specific job truth**.

> **The Playbook says what can or should happen. The Job Map says what actually applies, is assigned, is underway, is blocked or is complete on one Engagement.**

This distinction prevents two common failures:

- institutional knowledge remaining only in experienced people's heads;
- a large SOP/checklist system falsely claiming work has happened merely because a standard step exists.

## Core object distinction

### `operating_playbooks`

Versioned reusable process families. The current active playbook is `STAGE_PRESENCE_CORE_LIFECYCLE` v1.

### `operating_playbook_steps`

Reusable lifecycle knowledge. A step can describe:

- phase and ordering;
- whether it is CORE, CONDITIONAL or OPTIONAL;
- which Engagement species it can apply to;
- SYSTEM, ASSISTED or HUMAN automation boundary;
- default role/capability;
- client-touchpoint status;
- applicability/condition guidance;
- procedure depth;
- completion definition;
- expected evidence;
- risk if missed;
- dependencies;
- inputs, outputs and tags.

A playbook step is **not a task and not proof of completion**.

### `engagement_step_states`

Optional persisted truth for one Engagement when a lifecycle step actually needs explicit tracking. State can be:

`NOT_STARTED / READY / ACTIVE / WAITING / BLOCKED / DONE / SKIPPED / NOT_APPLICABLE`

It also preserves whether the step is REQUIRED, CONDITIONAL, OPTIONAL, NOT_APPLICABLE or still UNKNOWN for that Engagement, plus ownership, due timing, completion/evidence notes and certainty/provenance.

The system does **not** create an `engagement_step_states` row for every possible playbook step merely because a job exists.

### `work_items`

Attention and movement, not process inventory.

A work item exists because someone or something needs to act, decide, wait, resolve or follow up. It can reference a playbook step and/or persisted Engagement step state, but the 105-step knowledge map must never become 105 automatic tasks per job.

This keeps Today useful rather than bureaucratic.

## Assignment depth

### Engagement assignment

`engagement_assignments` answers:

> **Who is this contributor on this Engagement?**

It can hold:

- contributor/team member;
- job role;
- assignment state and certainty;
- scheduled window;
- location/schedule link;
- scope summary;
- briefing notes;
- acceptance criteria;
- acknowledgment state/time.

A person's presence in the assignment table does not by itself mean they accepted the work.

### Step assignment

`engagement_step_assignments` answers:

> **What specifically is this contributor responsible for?**

Responsibility types are:

- `LEAD`
- `SUPPORT`
- `APPROVER`
- `CONSULTED`
- `INFORMED`

This allows a person to be the job's Video Tech while leading commissioning and playback verification, supporting load-in, and merely being informed about client arrival time—without generating duplicate roles or separate disconnected task systems.

### Assignment brief

`assignment_brief_v` combines the role-level assignment with its granular lifecycle responsibilities, location/timing and completion definitions. It is the backend source for a future assignment sheet / contributor briefing.

The intended contributor experience is closer to:

> **Where am I going? When? Why does the job matter? What am I responsible for? What do I need? What does success look like? What changed?**

rather than exposing the entire business record.

## Current lifecycle coverage

The active v1 knowledge map contains **105 reusable steps across 13 phases**:

1. Intent & Intake
2. Requirements
3. Solution Design
4. Feasibility & Risk
5. Commercial
6. Commitment & Handoff
7. Installation-Specific Preparation
8. Preproduction & Preparation
9. Delivery & Experience
10. Strike, Return & Reconciliation
11. Economic Close
12. Closeout & Learning
13. Relationship & Recurrence

The playbook supports multiple Engagement species through one lifecycle model:

- `EVENT`
- `LONG_TERM_RENTAL`
- `INSTALLATION`
- `EQUIPMENT_SALE`
- `SERVICE`
- shared/universal lifecycle steps where appropriate.

A species filter changes which conditional branches are visible; it does not create a different CRM/job object.

## Procedure-depth governance

Not all process knowledge is equally mature. Each playbook step carries a `procedure_depth`:

### `MAP_ONLY`

The system knows the step exists and why/when it matters, but it does not claim to possess a safe or complete procedure.

This is especially important for technical, structural, electrical, rigging, traffic, equipment-handling, commissioning and safety-sensitive work.

### `CHECKLIST`

The business-level operating checks/completion conditions are represented, but this may still not be equipment-specific technical instruction.

### `SOP`

A detailed operating procedure has been represented.

### `VERIFIED_SOP`

A detailed SOP has been reviewed/verified through the appropriate qualified human/evidence process.

**Never promote MAP_ONLY to SOP merely because an AI can generate plausible instructions.**

## Learning rule

Every delivered Engagement can produce candidate learning about:

- sequence and missing steps;
- role/capability needs;
- venue/site behavior;
- equipment configuration;
- setup/strike/operation time;
- client dependencies;
- commercial handoff;
- scope change;
- failure/incident patterns;
- contributor training;
- economic actuals;
- recurrence.

But one anecdote should not silently rewrite company procedure.

The intended loop is:

**job reality → closeout/evidence → learning candidate → review/validation → playbook version change**

Material playbook changes should create a new version or an explicit reviewed update rather than erase historical operating context.

## Frontend relationship

The visible product is intentionally asymmetric:

### Today

Shows only movement and exceptions that deserve attention.

### Work

Shows the commercial/delivery story of each Engagement using frontend read contracts.

### Engagement → Job Map

Shows the applicable start-to-finish operating path for that Engagement. Untracked steps display as **available knowledge**, not incomplete work.

### Playbook

Lets internal users browse Stage Presence's reusable operating knowledge by Engagement species and phase.

The Playbook is a reference and learning surface; it should not dominate routine daily use.

## Automation direction

The Playbook is the future reasoning substrate for low-friction automation.

A system/AI layer can eventually evaluate current Engagement truth against step applicability and then:

1. satisfy deterministic/system steps silently where evidence is sufficient;
2. open or update a work item only when action/attention is actually needed;
3. assign/recommend responsibility based on required capability and contributor availability;
4. generate job briefs, assignment sheets, pull/pack lists and client dependencies from canonical data;
5. surface human judgment only for material technical, relationship, price, risk or exception decisions;
6. capture actual result and feed learning back into the next Playbook version.

The target is **less data entry and less remembering**, not more checkbox administration.

## Current reality boundary

As of 2026-09-10:

- active playbooks: 1;
- active reusable steps: 105;
- phases: 13;
- current open work items mapped to playbook knowledge: 7/7;
- persisted `engagement_step_states`: 0;
- `engagement_step_assignments`: 0;
- `team_members`: 0.

Those zeroes are intentional. The knowledge exists, while historical completion and contributor assignment have not been fabricated.

## Constitutional rule

> **Know the whole path. Track only the path that becomes real. Show each person only what helps them contribute. Learn from the result.**

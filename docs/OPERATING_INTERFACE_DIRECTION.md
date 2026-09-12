# Stage Presence OS — Operating Interface Direction

## Center

> **Stage Presence OS is one operating system over one shared business reality. Different people should see different relevant slices of the same canonical backend rather than maintain separate apps, spreadsheets, dashboards or duplicate records.**

The interface exists to make the current architecture usable through normal Stage Presence work. It is not an administrative database frontend and it is not another truth store.

## Product geometry

```text
                    ONE SHARED BACKEND
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     RELATIONSHIPS    ENGAGEMENTS      CAPABILITY
        │                │                │
        ├──── MONEY ─────┼──── TIME ──────┤
        │                │                │
     EVIDENCE          WORK            LEARNING
        │                │                │
        └────────────────┼────────────────┘
                         │
                  APPLICATION LAYER
                         │
          role + authority + context
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
      OWNER           SALES / OPS       TECH / CREW
    decisions        opportunity/job     assigned work
    exceptions       coordination        job brief
    economy           capture             schedule
```

The views differ. The truth does not.

## Primary interaction model

The Engagement workspace is the center for operating a piece of work. It should progressively answer:

1. **Who / why?** — customer, relationship, desired outcome and literal request.
2. **What do we know?** — requirements, constraints, preferences, observations, assumptions and unresolved truth.
3. **What are we proposing / delivering?** — configured Resources, commercial context and fulfillment scope.
4. **When / where?** — canonical Location and Schedule.
5. **Who is involved?** — contributor assignment, capability context and concrete responsibility.
6. **What needs attention?** — persisted Work plus derived Movement/Recovery signals.
7. **What is the economic reality?** — quote/revenue/collection/cost/contribution evidence at the certainty currently earned.
8. **What actually happened?** — actual usage, costs, outcomes and closeout learning as evidence arrives.

The interface should reveal deeper structure only when the decision or role requires it.

## Canonical-write rule

Every interaction must write to the owning domain rather than to a convenient screen-shaped duplicate:

- Venue/site → `locations` + `engagement_locations`
- Next movement / waiting / blocker → `work_items`
- Requirement / constraint / unknown → `engagement_facts`
- Resource relevance / requirement → `engagement_resources`
- Accepted operational scope → `fulfillment_plans` + `fulfillment_plan_lines`
- Timing → `engagement_schedule_items`
- Contributor on a job → `engagement_assignments`
- Concrete lifecycle responsibility → `engagement_step_assignments`
- Capacity hold/reservation/allocation → `resource_commitments`
- Actual deployment → `resource_usage`
- Payment transaction → `commercial_payments`
- Direct cost → `engagement_cost_items`
- Learning / actual outcome → `engagement_closeouts`

Compatibility fields may remain readable for inherited history, but new workflows must not reinforce them.

## Interface development order

Build product surfaces in the same evidence-first order as the backend:

1. **Use existing reality first.** Surface already-populated domains before adding objects.
2. **Make canonical capture natural.** A user should not need to know which table owns the truth.
3. **Show uncertainty honestly.** `POSSIBLE`, `REQUESTED`, `CONFIRMED`, `TBD`, `UNKNOWN`, estimated and conflicting states are meaningful UI states, not errors to hide.
4. **Prevent duplicate truth at the command boundary.** Repeated clicks or repeated capture should update/reuse the same business reality where appropriate.
5. **Use Recovery for gaps, not forms for completeness.** Ask only when the missing truth has decision leverage.
6. **Observe failure before schema expansion.** Solution design and explicit commitment/change-control remain candidate abstractions until repeated real use proves the current model cannot represent the business cleanly.

## Current interface frontier — 2026-09-12

Existing Stage Presence OS surfaces already cover:

- Today / selective movement
- Work / Engagement navigation
- Recovery
- customer/business story
- Facts / known and unknown truth
- Relationships / parties
- Resources
- canonical Next Move / Work
- commercial intelligence
- Engagement and company economy, including payment/cost capture where evidence exists
- Job Map / Playbook
- source evidence/activity
- learning closeout capture

The clearest existing-backend structures that lacked a natural operating surface were **Time** and **People**. PR #22 therefore adds first-class **Operating Reality** to the Engagement workspace:

- view/add canonical Schedule records;
- preserve date-only/TBD timing without manufacturing times;
- inherit the canonical primary Venue when appropriate;
- view current contributor roster and capability context;
- create job-specific assignments using explicit `POSSIBLE → REQUESTED → CONFIRMED` state rather than treating a name as a booking;
- prevent obvious duplicate schedule and assignment creation at the application boundary.

No new domain tables are introduced by this interface work.

## Target user experience

A mature Stage Presence OS should let a user operate primarily from a few simple surfaces:

- **Today** — what deserves my attention?
- **Capture** — tell the system what just happened / what I learned.
- **Engagements** — understand and operate a customer commitment from intent through closeout.
- **Relationships** — who are we creating value with and what history matters?
- **Capability** — what can Stage Presence deliver, from what source, and under what constraints?
- **Economy** — what is financially/economically supported by evidence?
- **Knowledge** — what has the company learned and how should work normally happen?

Role/context determines which parts are emphasized. The backend remains one shared reality.

## AI boundary

AI should eventually make this interface easier by interpreting incoming evidence, proposing matches, suggesting structured capture, explaining uncertainty and surfacing exceptions. It does not become canonical authority for money, commitments, inventory, permissions, assignments or deletion.

```text
photo / email / conversation / document
                 ↓
            source evidence
                 ↓
        AI interpretation/proposal
                 ↓
       deterministic domain command
                 ↓
          canonical business truth
                 ↓
              events/audit
```

The interface should therefore evolve toward low-entry capture plus review, not toward users manually maintaining dozens of database fields.

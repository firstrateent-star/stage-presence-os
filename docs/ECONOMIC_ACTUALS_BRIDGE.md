# Economic Actuals Bridge

## Center

Stage Presence should not learn profitability from plans alone.

The operating loop already separates configured resources from committed capacity, committed capacity from actual usage, assigned crew from completed crew, quoted revenue from collected cash, and estimated/committed cost from actual cost.

The Economic Actuals Bridge connects those existing realities without creating a new truth domain.

```text
completed crew / confirmed resource usage
                ↓
      ECONOMIC ACTUALS BRIDGE
                ↓
    direct-cost evidence present?
         ↙                 ↘
       yes                  no
        ↓                    ↓
 economics can use it    capture / defer / unknown
```

## Governing rule

> Actual activity may create a cost question. It does not automatically create a cost answer.

A completed technician assignment does not establish hours, pay rate, or total labor cost. A subcontracted resource actually used creates a strong direct-cost question, but the system must not fabricate the vendor amount. An owned resource being used does not automatically imply a direct cash cost for that Engagement.

## Canonical homes

- crew actual → `engagement_assignments.assignment_state = COMPLETED`
- resource actual → `resource_usage`
- direct job cost → `engagement_cost_items`
- reusable cost assumptions → `economic_rate_profiles`

No `economic_actual_candidates` table is introduced.

## Rate authority

- `APPROVED` rates may support calculation when quantity/time is known.
- `DRAFT` rates are context only.
- a DRAFT rate must never silently generate an actual cost.
- absent an approved rate or quantity, a human may record a known actual total or leave it unresolved.

The current Scott/Ben hourly profiles remain DRAFT and are therefore not automatic cost authority.

## Cost identity

Manual actual-cost capture from the bridge uses deterministic `source_key` identity so repeated edits update the same evidence rather than creating duplicate active truth.

- crew: `manual-actual-cost:assignment:<assignment_id>`
- resource use: `manual-actual-cost:usage:<resource_usage_id>`

The underlying `engagement_cost_items` record remains canonical.

## What this does not do

- No payroll system.
- No vendor AP ledger.
- No QuickBooks replacement.
- No automatic cost generated from DRAFT rates.
- No owned-equipment allocation invented from usage.
- No assumption that every actual operational item must have a direct job cost.

The goal is evidence continuity:

```text
PLAN → COMMIT → ACTUAL OPERATION → ACTUAL ECONOMICS → LEARNING
```

# Actuals Runtime v1

## Purpose

Actuals Runtime closes the operating loop without rewriting planned history.

```text
PLAN → COMMITMENT → ACTUAL OPERATION → ACTUAL COST → VARIANCE → CLOSEOUT → LEARNING
```

The governing rule is:

> **Plan is not Actual, and Actual does not rewrite Plan.**

## Canonical homes

- assignment / planned crew relationship → `engagement_assignments`
- actual crew time → `engagement_labor_actuals`
- planned / actual Resource movement → Resource commitments + Warehouse Fulfillment Runtime
- actual Resource use → `resource_usage`
- estimate / committed / actual direct cost → `engagement_cost_items`
- customer Cash → `commercial_payments`
- outcome / learning → `engagement_closeouts`

No generic `actuals` table is introduced.

## Labor actuals

A completed assignment is not proof of hours worked. `engagement_labor_actuals` represents one or more actual work segments for a contributor.

Work types include warehouse, load-in, setup, show, strike, return, install, service, drive and programming.

A labor actual may link to a confirmed/completed assignment or represent unplanned work with no assignment link.

### Commands

- `recordLaborActual()`
- `completeAssignmentFromActuals()`

Completing an assignment through the new command requires at least one labor-actual record.

## Resource actuals

`resource_usage` remains the canonical actual-use table. Actuals Runtime now anchors normal usage to a confirmed/fulfilled `resource_commitment`.

### Command

- `recordResourceUsageFromCommitment()`

Guardrails:

- tentative/configured Resource scope is not usage authority,
- quantity must be positive,
- usage above committed quantity requires explicit override + reason,
- warehouse custody state remains separate from actual use.

A Resource can be Loaded or Out without being recorded as Used.

## Actual cost

`engagement_cost_items` remains the cost ledger. Actuals Runtime adds links:

- `planned_cost_item_id`
- `labor_actual_id`
- `resource_usage_id`

A new database guard prevents ESTIMATE/COMMITTED cost rows from being mutated into ACTUAL rows.

Instead:

```text
planned cost row ──linked to──> actual cost row
```

This preserves historical expectation and enables real variance.

### Commands

- `recordActualCost()`
- `recordLaborActualCostFromApprovedRate()`

Only an **APPROVED** effective Cost Book rate may automatically calculate actual labor cost. DRAFT rates remain context only.

Actual activity can exist without an actual cost when the cost is genuinely unknown.

Owned-equipment usage does not automatically create a direct cash cost. Subcontracted/partner usage creates a direct-cost question, not an invented answer.

## Read contracts

### `engagement_labor_actuals_v`

Shows planned assignment timing beside actual labor timing/hours and linked labor cost.

### `engagement_resource_actuals_v`

Shows Resource commitment vs actual use, quantity variance, and whether actual direct cost is a real unresolved question.

### `engagement_actual_cost_line_variance_v`

Shows precise actual-vs-planned variance when an ACTUAL cost is linked to its plan row.

### `engagement_cost_variance_v`

Category-level estimate / committed / actual comparison.

### `engagement_actuals_position_v`

Engagement-level decision surface combining:

- crew actual coverage,
- actual labor hours,
- Resource usage coverage,
- actual direct cost,
- observed contribution,
- structured vs imported Cash evidence,
- warehouse return state,
- closeout readiness.

Primary states:

- `ACTUALS_NOT_STARTED`
- `ACTUALS_NOT_CAPTURED`
- `LABOR_ACTUALS_NEEDED`
- `RESOURCE_USAGE_NEEDED`
- `ACTUAL_COSTS_INCOMPLETE`
- `WAREHOUSE_RETURN_OPEN`
- `CLOSEOUT_NEEDED`
- `ACTUALS_BASELINE_COMPLETE`

## Cash boundary

Actuals Runtime reads both structured Cash transactions and imported collection evidence, but does not pretend they are the same authority.

- `commercial_payments` = structured transaction-level Cash
- imported `amount_paid` / economics views = collection evidence

QuickBooks remains formal accounting / GL authority.

## What this does not do

- No payroll system.
- No AP ledger.
- No QuickBooks replacement.
- No automatic labor cost from DRAFT rates.
- No automatic cost from owned Resource usage.
- No automatic closeout.
- No fabricated historical actuals.

## Frontend implication

No frontend redesign is required for v1. The eventual job surface can simply ask the human for the missing actual truth:

- Who actually worked and for how long?
- What equipment was actually used?
- What did it actually cost?
- What differed from plan?
- Is equipment back, inspected and restocked?
- Is the job ready to close and learn from?

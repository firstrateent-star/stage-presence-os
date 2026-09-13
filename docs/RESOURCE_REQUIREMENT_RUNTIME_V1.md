# Resource Requirement Runtime v1

## Purpose

Resource availability cannot be trusted until Stage Presence knows when a Resource actually leaves availability and when it can safely return.

The runtime therefore separates:

**job/event timing evidence → candidate requirement window → explicit requirement window → hold/reservation decision**

Schedule and event dates can suggest timing, but they do not become verified capacity truth automatically.

## Canonical owner

Requirement timing remains on `engagement_resources`:

- `required_from_date`
- `required_through_date`
- `requirement_window_state`
- `planned_sourcing_model`
- `quantity`

No second requirement table is introduced.

## Read contracts

### `resource_requirement_position_v`

For each Engagement/Resource relationship, exposes:

- represented requirement window and certainty
- quantity and planned sourcing
- accepted-commercial state
- schedule/event candidate dates
- candidate basis (`SCHEDULE_EVIDENCE`, `EVENT_DATE_ONLY`, `NO_CANDIDATE`)
- active/confirmed Resource commitments
- next decision: window needed vs ready for commitment vs commitment represented

### `engagement_resource_requirement_summary_v`

Rolls requirement coverage up to the Engagement so the OS can see whether a commercially committed job still needs Resource windows before capacity commitments can be trusted.

## Commands

### `setResourceRequirementWindow()`

Persists an explicit window, quantity and optional sourcing model.

### `applyRequirementWindowCandidate()`

Uses the derived schedule/event candidate only after explicit confirmation and stores the chosen certainty (`INFERRED_FROM_EVENT`, `ESTIMATED`, or `KNOWN`).

This command does not create a Resource hold or reservation.

## Guardrails

- event date is not automatically the Resource occupancy window
- schedule-derived timing remains a candidate until explicitly adopted
- requirement window is not a reservation
- reservation is not actual usage
- quantity Unknown does not become zero
- capacity checks remain in the Commercial → Operations Bridge

## Next

With requirement windows represented, Stage Presence can progressively create tentative holds/reservations, then build the warehouse fulfillment loop:

**available → reserved → pull → loaded → deployed/picked up → returned → inspected → restocked → available**

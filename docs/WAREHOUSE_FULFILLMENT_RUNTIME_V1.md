# Warehouse Fulfillment Runtime v1

## Purpose

Stage Presence needs to know where committed equipment is in the fulfillment cycle without confusing warehouse movement with actual job usage.

The runtime owns the current custody/prep state for a confirmed Resource commitment:

**awaiting pull → pulled → loaded → out → returned → inspection → restocked**

Exceptions remain explicit.

## Canonical shape

`resource_fulfillment_states` is one current-state record per `resource_commitments` row.

It stores:
- current fulfillment state
- quantity being fulfilled
- custody state
- return condition
- issue quantity
- timestamps for pull/load/out/return/inspection/restock
- notes/metadata

History remains in the existing `events` ledger rather than creating another event system.

## Important boundaries

- requirement window != Resource commitment
- Resource commitment != warehouse movement
- warehouse movement != actual Resource usage
- returned != inspected
- inspected != restocked
- damaged/missing/service-required returns are exceptions, not successful restocks

`resource_usage` remains the owner of actual deployed/use evidence.

## Read contracts

### `warehouse_fulfillment_queue_v`

Projects confirmed/active commitments into the warehouse queue and exposes the next operational decision:
- pull needed
- load/release needed
- outbound needed
- return pending
- inspection needed
- restock needed
- warehouse complete
- exception review

### `engagement_warehouse_position_v`

Rolls the queue to the Engagement so the OS can see whether a job is awaiting pull, in outbound prep, has Resources out, needs inspection/restock, is complete, or has an exception.

## Commands

### `initializeWarehouseFulfillment()`

Creates the initial `AWAITING_PULL` state only for a CONFIRMED Resource commitment.

### `transitionWarehouseFulfillment()`

Enforces the normal state path and writes a corresponding event to the existing event ledger.

Returning equipment with a damaged/missing/service-required/conflicting condition cannot be marked successfully RESTOCKED until that condition is resolved.

## Next

After this runtime carries real jobs, the next layer can record actual Resource usage and crew time, then connect returned exceptions to maintenance/service work and closeout learning.

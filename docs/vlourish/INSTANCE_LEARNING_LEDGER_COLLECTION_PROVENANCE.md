# Stage Presence Learning Ledger — Collection Provenance

## Observation

Stage Presence can represent later transaction-level payments while QuickBooks remains accounting authority. A payment row entered manually and a payment row verified against accounting are not epistemically identical even when the amount is the same.

## Intervention

Add a provenance layer over existing `commercial_payments` rather than creating a second collection ledger:

- preserve the existing payment transaction;
- distinguish `MANUAL` / `PROCESSOR` / `ACCOUNTING` source type;
- allow a human to explicitly promote certainty to `VERIFIED` after checking authoritative external evidence;
- retain aggregate imported collection baselines separately from transaction-level evidence.

## Expected value

Improve confidence in collection visibility without duplicating QuickBooks or double-counting historical receipts.

## Vlourish candidate learning

**Same value does not imply same evidence quality. Provenance should be promotable without duplicating the underlying business event.**

Status: instance-supported candidate; not Canon.

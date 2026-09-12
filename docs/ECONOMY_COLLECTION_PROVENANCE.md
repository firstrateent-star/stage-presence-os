# Economy Collection Provenance

Stage Presence does not replace QuickBooks as accounting authority.

The OS may represent engagement-level payment evidence, but it must preserve how that evidence became known.

## Evidence states

- `MANUAL` + `KNOWN`: a human reported the payment and Stage Presence represents it as known business evidence.
- `PROCESSOR` + `VERIFIED`: the existing payment was explicitly checked against payment-processor evidence.
- `ACCOUNTING` + `VERIFIED`: the existing payment was explicitly checked against accounting evidence such as QuickBooks.
- `CONFLICTING`: evidence disagrees and should not be flattened into a resolved collection state.

Verification upgrades provenance on the existing payment row. It does not create another payment.

Aggregate imported collection baselines remain separate from transaction-level payments so historical receipts inside the baseline are not double counted.

## Contribution readiness

Contribution is supportable only when the represented revenue and direct-cost evidence justify it. Missing direct cost is never interpreted as zero.

The Economy interface therefore distinguishes:

- actual contribution supported;
- projected contribution supported;
- direct costs missing;
- program allocation intentionally unresolved.

This is evidence quality, not a generic business-health score.

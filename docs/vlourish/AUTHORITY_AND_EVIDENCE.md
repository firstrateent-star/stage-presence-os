# Stage Presence — Authority & Evidence Contract v0.1

## Center

Stage Presence intelligence must increase aligned value without silently increasing authority or certainty.

## 1. Authority levels

### Level 0 — Observe
Allowed:
- read
- summarize
- calculate
- identify
- compare
- detect conflicts / gaps

No canonical mutation.

### Level 1 — Suggest
Allowed:
- recommend pricing
- recommend schedule
- recommend resource / crew options
- draft customer communication
- propose next action
- propose interpretation of evidence

Human decides.

### Level 2 — Reversible action
Allowed only through governed application commands with provenance and auditability.
Examples:
- create internal work item
- save a draft
- categorize evidence
- create tentative / possible assignment
- save a recovery disposition

These actions must remain reversible and must not imply stronger certainty than the evidence supports.

### Level 3 — Consequential action
Requires explicit approval unless a future specific policy grants bounded authority.
Examples:
- send customer quote
- change approved pricing
- commit equipment
- approve financial transaction / refund
- sign / accept agreement
- delete material records
- publish customer-facing commitment

## 2. Agent boundary contract

Any meaningful future Stage Presence agent should declare:
- identity: name, version, purpose, domain
- inputs: allowed context and required data
- tools: permitted capabilities
- authority level
- known / inferred / unknown distinctions
- actions it may take
- actions requiring approval
- prohibited actions
- structured output contract
- evaluation criteria

Preferred output fields:
- result
- confidence
- evidence_used
- assumptions
- unknowns
- actions_taken
- recommended_next_action
- requires_human_review

## 3. Evidence separation

Stage Presence must distinguish three evidence classes.

### A. Operational / outcome evidence
What happened in reality?
Examples:
- quote sent
- customer responded
- job duration
- actual resource use
- actual labor
- collected payment evidence
- margin where costs are supported
- repeat / referral behavior
- closeout outcome

Canonical homes are domain records plus provenance/events; not AI logs.

### B. AI / workflow evaluation evidence
Did the intelligent workflow behave correctly?
Examples:
- pricing arithmetic accuracy
- scope completeness
- unsupported claims
- epistemic discipline
- correct authority handling
- human acceptance / correction rate

This evidence evaluates intelligence; it does not prove business value.

### C. Technical observability
What happened inside the technical system?
Examples:
- model / workflow version
- tool calls
- reads / writes
- latency
- errors
- handoffs
- approvals
- deployment version

This explains execution; it does not substitute for outcome evidence.

## 4. Promotion rule

Implementation ≠ correctness.  
Correctness ≠ value.  
Value in one instance ≠ domain truth.  
Domain evidence ≠ Vlourish Canon.

Any future methodology promotion should preserve evidence lineage and exceptions.

## 5. Epistemic rule

When evidence is missing, uncertain or conflicting, Stage Presence should preserve that state rather than manufacture resolution.

Expected states include:
- known / verified
- partial / estimated
- inferred / assumed
- conflicting
- unknown
- not applicable
- needs decision

Unknowns should be resolved according to decision leverage, not database-completeness pressure.
# Stage Presence — Instance Learning Ledger v0.1

This ledger records Stage Presence observations and learnings that may inform future domain or Vlourish methodology work. Entries are **not Canon**. Promotion requires stronger evidence and, where appropriate, cross-validation in other systems.

---

## SPL-0001 — Apparent architecture gaps may be unactivated existing structures

**Status:** Supported in this instance / Candidate learning  
**Question:** Were Stage Presence's empty operating tables evidence of missing architecture or incomplete activation?

### Context
Several existing structures were mostly empty: team members, capabilities, assignments, schedules, step states, usage, payments, costs, commitments and closeouts.

### Intervention
Recover existing evidence into current canonical homes before introducing new abstractions.

### Observed outcome
A first activation pass populated roster/capabilities, schedules, step states and resource links. Recovery burden fell materially without adding a competing domain model.

### Reflection
A meaningful share of the apparent incompleteness came from existing evidence not yet occupying the structures already designed for it.

### Candidate generalized learning
> Prefer activating and testing existing canonical abstractions before introducing new ones.

### Known exceptions
An existing abstraction may still be wrong, overloaded or missing important semantics. This principle must not become a rule against necessary schema evolution.

### Canon effect
None. Candidate only.

---

## SPL-0002 — Planned reality and actual reality must remain distinct

**Status:** Supported in this instance / Candidate learning

### Observation
Configured resources, fulfillment scope and planned crew do not prove what was actually delivered or who actually worked.

### Intervention
Keep planned records intact and require explicit confirmation before creating `resource_usage` or marking confirmed assignments completed.

### Reflection
Preserving plan → actual distinction enables variance, learning and auditability. Automatic promotion would manufacture operational history.

### Candidate generalized learning
> Expected, planned, committed and actual reality should be represented distinctly when their difference affects decisions or learning.

### Canon effect
None. Candidate only.

---

## SPL-0003 — Deeper backend should reduce human cognitive load

**Status:** Testing / Candidate interface principle

### Observation
Stage Presence now contains substantial detail across engagements, facts, resources, schedules, relationships, commercial evidence, work and uncertainty. Exposing all of it equally would increase operational burden.

### Interventions
Derived surfaces such as Today, Recovery and Delivery Readiness selectively expose decision-relevant information while retaining deeper structured reality underneath.

### Expected value
- fewer status-reconstruction questions
- fewer unnecessary data-completeness tasks
- clearer daily focus
- less founder-memory dependency

### Evidence still needed
Actual user behavior and operating outcomes must be observed before claiming value.

### Candidate generalized learning
> The depth of the backend should reduce, not increase, the cognitive burden placed on the human.

### Canon effect
None. Candidate only.

---

## SPL-0004 — Missing information should be ranked by decision leverage

**Status:** Supported in this instance / Candidate learning

### Observation
Not every unknown quantity, price, schedule detail or operating fact deserves immediate human attention.

### Intervention
Recovery prioritizes unknowns/conflicts according to urgency, business impact and decision leverage, while allowing defer / unknown / needs-decision outcomes.

### Reflection
'I don't know' can be a valid operational state. Completeness is not the same as usefulness.

### Candidate generalized learning
> Resolve uncertainty according to decision leverage rather than completeness pressure.

### Canon effect
None. Candidate only.

---

## SPL-0005 — Equipment sale actuals may be a distinct semantic species

**Status:** Observation / Open question

### Observation
`resource_usage` works naturally for event/rental delivery actuals but may not correctly represent equipment ownership transfer or disposition in an equipment sale.

### Hypothesis
Equipment sales may eventually require explicit transfer/disposition semantics distinct from resource usage.

### Action
Do not add schema yet. Observe additional sale workflows and document repeated reconstruction/ambiguity if it occurs.

### Canon effect
None.
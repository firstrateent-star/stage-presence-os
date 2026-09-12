# ADR-0003 — Activate existing canonical structures before adding new abstractions

**Status:** Accepted  
**Date:** 2026-09-12

## Context

Stage Presence accumulated several apparently empty or incomplete operating areas: team members, capabilities, assignments, schedules, payments, costs, commitments, usage, step states and closeouts. Early recovery work showed that some apparent gaps were not missing schema; they were existing structures that had not yet been populated from available evidence or normal workflow.

## Decision

Before introducing a new canonical table / aggregate / abstraction:
1. populate and use what already exists;
2. move information to the correct canonical home;
3. stop reinforcing compatibility fields / duplicate truth;
4. observe repeated model failure in real operation;
5. migrate only after the missing abstraction is evidenced.

## Consequences

- Empty tables are not automatically design failures.
- Historical evidence should be recovered into existing structures where safe.
- Unknown / absent evidence may remain unknown rather than being fabricated.
- Solution design and commitment/change-control remain hypotheses until repeated operating friction proves their need.
- Database growth follows demonstrated reality instead of speculative completeness.
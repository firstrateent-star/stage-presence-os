# Decision — Backend Growth Must Not Imply Frontend Growth

**Date:** 2026-09-10  
**Status:** Accepted

## Decision

Stage Presence OS will keep canonical business truth structurally rich while requiring all visible product information to pass through an explicit presentation boundary.

The path is:

**canonical truth → business read contract → presentation model → visual component**

New backend fields, tables, relationships and evidence are **not automatically visible**. They remain hidden until a product decision intentionally maps them into a presentation model for a specific user and moment.

## Why

The company needs increasing depth in process, pricing, assignments, resources, venues, economics, evidence, automation and learning. If the frontend mirrors that depth directly, the system will become harder to use precisely as it becomes more capable.

The presentation boundary lets backend intelligence scale without consuming more human attention by default.

## Information tiers

Visible information is organized as:

**ATTENTION → SUMMARY → OPERATING_DETAIL → REFERENCE → EVIDENCE**

Today should concentrate ATTENTION. Work cards should remain SUMMARY. Engagement workspaces reveal OPERATING_DETAIL progressively. Reusable process/history belongs primarily in REFERENCE. Provenance/audit belongs in EVIDENCE unless uncertainty itself changes a decision.

## Implementation

- `src/lib/presentationModel.ts` is the first explicit frontend adapter layer.
- `src/components/EngagementSummaryCard.tsx` is the first shared component consuming a presentation model rather than parsing backend shape.
- Today and Work use the same Engagement presenter/card semantics.
- `docs/PRESENTATION_ARCHITECTURE.md` is the canonical design reference.

## Contract evolution

Business read views should remain additive when possible. A newly added optional backend field is safe because existing presenters ignore it.

If the meaning of an existing read-contract field changes materially, introduce a new contract/version instead of silently changing what an existing frontend believes the field means.

## Governing rule

> **Store richly. Interpret centrally. Present selectively. Reveal progressively.**

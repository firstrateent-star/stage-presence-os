# ADR-0001 — Stage Presence OS is the canonical structured operational system

**Status:** Accepted  
**Date:** 2026-09-12

## Context

Stage Presence information currently exists across Goodshuffle history, QuickBooks, email, documents, conversations and the Stage Presence OS database. Without explicit authority boundaries, new interfaces and AI workflows can create duplicate or conflicting truth.

## Decision

Stage Presence OS / Supabase is the canonical structured operational system for the operational domains it explicitly represents.

External systems remain authoritative for their original records where appropriate:
- QuickBooks Desktop: formal accounting / general ledger
- communication provider: original messages
- document store: original artifacts
- Goodshuffle: transitional historical / operational evidence where stronger verified Stage OS truth does not yet exist

Stage Presence OS may reference, summarize, structure and operationalize those sources with provenance.

## Consequences

- New operational workflows should write to canonical Stage OS domain homes rather than compatibility fields.
- Source conflicts must remain visible rather than silently overwritten.
- Replacing an external tool does not require rewriting Stage OS domain meaning.
- Stage OS does not become a general ledger, email archive or document-management clone.
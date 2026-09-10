# Goodshuffle Reality Recovery — 2026-09-09

This document records the continuation boundary after the prior Stage Presence OS build conversation reached its context limit.

## Constitution preserved

The canonical business object remains the **Engagement**.

Reality is separated as:

**Engagement → Commercial Reality → Fulfillment Reality → Operating Continuity → Learning**

Do not recreate Goodshuffle's ontology. Goodshuffle is evidence/history, not the future operating model.

Critical distinctions remain:

- commercial document ≠ fulfillment plan
- fulfillment plan ≠ inventory hold/reservation
- inventory reservation ≠ actual usage
- historical quoted price ≠ current approved price
- source snapshot ≠ current bank/accounting truth
- configured item ≠ owned/available/committed item

## GitHub / Supabase recovery

The previously unfinished `flower/reality-commercial-kernel` branch was recovered, build-checked, and merged through PR #10.

That brought GitHub `main` back into sync with the live Supabase migrations for:

- commercial documents + lines
- payment schedules + payments
- engagement execution schedules
- team members + assignments
- work items + daily work queue
- source-artifact segments
- pricing observations
- fulfillment plans + fulfillment lines

## Goodshuffle fulfillment import

The September 9 Goodshuffle pull-sheet packet contains 30 project-specific line-item-group workbooks and 30 item-category views.

The project-specific line-item-group workbooks contain **208 actual raw fulfillment rows**.

The aggregate export reports only **207** because it omits one real Shellabration line with quantity `0` (`Discount-Promotional for 4 VIP Tickets to event`). Stage Presence OS preserves all 208 rows.

Live Supabase state after recovery:

- **30 / 30** Goodshuffle project pull sheets represented as `fulfillment_plans`
- **208 / 208** raw line-item-group rows represented as `fulfillment_plan_lines`
- **128** fulfillment lines linked to canonical `resources` by exact Goodshuffle external ID
- **2** source lines carry an external Goodshuffle ID not yet represented by a canonical Resource (`Video Tech` and `Content Creation` on the Film Festival project)
- **1** zero-quantity historical line preserved
- **3** indented package-child rows preserved explicitly

Source-key conventions:

- `goodshuffle:pullsheet-segment:2026-09-09:<project_id>`
- `goodshuffle:pullsheet-plan:2026-09-09:<project_id>`
- `goodshuffle:pullsheet-line:2026-09-09:<project_id>:<source_row>`

Resource linkage is exact-ID only. Name guessing is not used.

Line metadata preserves source row, group, group dates, raw title, package-child signal, duration text, address, external item id, and source-file identity where available.

## Important source behavior learned

The two Goodshuffle pull-sheet views are overlapping evidence, not interchangeable truth:

- **Line Item Group** preserves fulfillment grouping, durations, addresses, package hierarchy, custom rows and zero-quantity oddities.
- **Item Category** can add equipment/category attributes but may omit package-parent or zero-quantity rows.

The line-item-group view is therefore the canonical raw fulfillment-row source for this recovery.

## First reality-derived daily queue

The `work_items` layer is no longer empty. The first queue was derived from September 9 reality rather than generic placeholders.

Initial actions include:

- prepare Music Farm gear and lock Sep 10 delivery timing
- verify Music Farm's Sep 9 snapshot balance before fulfillment
- lock UNC Sep 12 home-opener logistics/crew/travel details
- advance the unsigned Cummins Sep 24 quote
- advance the unsigned IES Sep 25 rental decision
- advance the unsigned Sep 26 20th Anniversary Party quote
- confirm operational delivery/access details for the signed-and-paid St. John Neumann Sep 26 job

No owner name is hard-coded. Work remains unassigned until the team-member / username layer is deliberately populated.

## Identity rule

Do not make the product globally 'Greg-centric'. Historical source evidence may literally say Greg Walker because that is what Goodshuffle recorded, but operating ownership must resolve through `team_members` / usernames and the signed-in user can be shown as `You` where appropriate.

## Source-file storage honesty

The current recovery has structured source provenance and semantic extraction, but the original Goodshuffle spreadsheet/PDF binary files are **not** claimed to be stored in Supabase Storage.

Do not confuse a `source_artifacts` row / SHA-256 reference with a recoverable private binary.

A deliberate private document-import seam should eventually preserve future raw files, but storage permissions should not be widened casually.

## Next backend priorities

1. Populate **commercial_document_lines** from high-confidence commercial pages so pricing history becomes line-level evidence rather than only document totals.
2. Materialize explicit **payment schedules / payments** where the packet provides sufficient evidence, keeping snapshot truth separate from accounting truth.
3. Convert explicit fulfillment timing into **engagement_schedule_items** without inventing times when Goodshuffle says TBD.
4. Populate **team_members / assignments** using usernames rather than hard-coded people in product logic.
5. Evolve `work_items` from this seeded daily queue into durable next-move generation driven by commercial, fulfillment, payment, capacity, and schedule states.
6. Use recurring historical patterns to propose reusable quote/job templates, but never silently convert them into authoritative pricing or capacity rules.

## Architectural north star

The system should increasingly understand:

**what happened → what was offered → what was signed → what was paid → what was planned → what was actually needed → what resources were involved → who owned the next move → what happened operationally → what should improve next time**

That structure is the foundation for native pricing guidance, quote generation, assignment sheets, job briefs, pull/prep sheets, review documents, financing structures, sales/rentals, analytics, and methodology-level learning without forcing users to duplicate data entry.
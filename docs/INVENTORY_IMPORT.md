# Inventory Import Policy

## Source
`Stage Pressense Inventorypricing(1).xlsx` supplied 2026-09-08.

## Authority
REFERENCE ONLY. Completeness: PARTIAL. Verification: MIXED / generally unverified unless separately confirmed.

## Observed shape
The overview contains 67 listed rows below the header across LED Trailer, Video Wall, T-Poster, Audio, Lighting, Rigging, and Staging categories.

## Known conflicts/gaps
- 10x5 LED Trailer pixel pitch differs between overview and trailer detail sheet (overview 3.91 vs detail 4.9mm).
- T-Poster overview shows quantity 8 while detail sheet quantity is blank.
- Multiple detail tabs contain sparse or blank information while the overview contains richer quantities.
- Many condition, purchase date, and pricing values are missing.

## Import rules
- Do not silently choose between conflicting values.
- Store source provenance.
- Use `UNVERIFIED`, `UNKNOWN`, or `CONFLICTING` where appropriate.
- Treat any price found as `LEGACY_REFERENCE` unless explicitly verified current.
- Resource existence is not resource availability.
- Improve resource truth progressively through real use rather than requiring a full warehouse audit before launch.

## Imported reference snapshot — 2026-09-08
The Supabase resource library contains 67 reference rows from the workbook: 62 quantity states `UNVERIFIED`, 5 `UNKNOWN`, 5 `LEGACY_REFERENCE` price rows, and one explicitly `SUBCONTRACTED` staging capability row. Known trailer/poster conflicts remain in resource attributes for later verification.

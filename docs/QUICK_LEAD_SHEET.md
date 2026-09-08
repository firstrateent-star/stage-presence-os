# Stage Presence Quick Lead Sheet — v0.1

## Purpose
The Quick Lead Sheet is a low-friction physical capture surface for Stage Presence OS. It is not a CRM form and it is not the system of record.

Greg should be able to capture reality quickly while on a call, in the warehouse, on site, or while moving. The operating system should do the clerical structuring later.

Governing principle:

> Greg supplies reality once. Stage Presence OS does the remembering, structuring, resurfacing, and routine clerical work around it.

## Design rules
1. One page.
2. Large handwriting areas and large checkboxes.
3. No internal database terminology.
4. No requirement to complete every field.
5. Unknown is acceptable.
6. Customer-requested equipment is recorded literally and never silently converted into a verified technical requirement.
7. The freeform notes area is first-class evidence, not an overflow field.
8. The sheet should be photographable in one frame.
9. Future QR code may open the private New Capture surface in Stage Presence OS.
10. Paper, voice, text, email reference, and future web intake should converge into the same Engagement model.

## Printable content

### Header
STAGE PRESENCE — QUICK LEAD

Received: __________  Time: ________
Taken by: __________

### WHO
Company / Customer: ______________________________________
Contact Person: ___________________________________________
Phone: ______________________  Email: ______________________

### WHAT
Event / Project Name: _____________________________________

Type:
[ ] Event
[ ] Long-Term Rental
[ ] Installation
[ ] Equipment Sale
[ ] Service
[ ] Unsure / Other

What are they asking for?
___________________________________________________________
___________________________________________________________

### WHEN + WHERE
Event / Project Date(s): __________________________________
Venue / Location: _________________________________________
Setup / Access Date or Time: ______________________________

### WHAT THEY MENTIONED
[ ] LED Trailer
[ ] Video Wall / LED Panels
[ ] Audio
[ ] Lighting
[ ] Stage
[ ] Content / Playback
[ ] Installation
[ ] Service / Repair
[ ] Delivery / Logistics
[ ] Other: ______________________________

### NOTES / WHAT THEY SAID

Large blank handwriting area occupying roughly one-third of the page.

___________________________________________________________
___________________________________________________________
___________________________________________________________
___________________________________________________________
___________________________________________________________
___________________________________________________________

### NEXT MOVE
[ ] Call
[ ] Quote
[ ] Need More Info
[ ] Site Visit
[ ] Check Equipment / Feasibility
[ ] Follow Up
[ ] Other: ______________________________

When? ______________________

Waiting on / important blocker, if any:
___________________________________________________________

## What the sheet means semantically
The sheet captures observations and literal communication, not final solution truth.

Example:
Customer says: “We need the 17x10 trailer and speakers.”

Preserve:
- CUSTOMER_REQUEST: 17x10 trailer
- CUSTOMER_REQUEST: speakers/audio

Do not silently convert to:
- verified screen requirement
- verified audio design
- inventory reservation
- confirmed availability
- final price

The OS may later derive candidate questions such as audience size, power, playback, venue access, weather exposure, setup window, labor, or alternate solution options. Those remain assumptions/unknowns until verified.

## Field mapping into Stage Presence OS
- Company / Customer -> Party (ORGANIZATION), role CUSTOMER where appropriate
- Contact Person -> Party (PERSON), role PRIMARY_CONTACT where appropriate
- Phone / Email -> Party contact fields
- Event / Project Name -> Engagement name
- Type -> Engagement type
- What are they asking for? -> Engagement customer_request and/or CUSTOMER_REQUEST facts
- Event / Project Date(s) -> event_start / event_end or EVENT facts if ambiguous
- Venue / Location -> venue fields / VENUE facts
- Setup / Access -> LOGISTICS fact unless cleanly structured
- What They Mentioned -> candidate Engagement resource links and/or CUSTOMER_REQUEST facts
- Notes -> source artifact raw text / source image provenance
- Next Move -> next_action
- When -> next_action_at
- Waiting on / blocker -> attention state context

## Photo-ingestion target behavior
Future flow:
1. Greg photographs the completed sheet.
2. Original image is stored as a Source Artifact.
3. Extraction produces candidate values only.
4. The system matches or creates Parties where confidence is sufficient.
5. One canonical Engagement is created or updated.
6. Literal customer requests are kept separate from inferred technical needs.
7. Dates/contacts/resources/venue are populated when evidence is clear.
8. Ambiguous items become UNKNOWN / REQUESTED / CONFLICTING rather than guessed truth.
9. A Next Move is generated or preserved.
10. Greg is asked only about high-value ambiguity or exceptions.

## Future intake surfaces
All should feed the same Engagement system:
- photo of Quick Lead Sheet
- voice note / dictation
- typed natural capture
- pasted text message
- email reference
- private website lead form
- selected public website inquiries
- later Goodshuffle / other system imports where justified

The Quick Lead Sheet is one doorway, not a separate lead database.

## Success metric
A useful Quick Lead workflow should reduce Greg’s required interaction to approximately:

capture once -> review only exceptions -> move on

The system should earn additional intake complexity only if it measurably reduces missed opportunities, latency, rework, or founder-dependent memory.

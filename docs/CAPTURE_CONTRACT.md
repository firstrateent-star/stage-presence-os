# Capture Contract — Stage Presence OS v0.1

## Purpose
The Capture Contract is the source-agnostic membrane between real-world input and Stage Presence Shared Reality.

A capture may originate from:
- a photographed Quick Lead Sheet
- a voice note
- typed natural language
- pasted text/message
- an email reference
- a private web form
- a future public website inquiry
- a later external-system import

All sources should converge into the same Engagement/Party/Fact/Resource/Event architecture rather than creating separate lead silos.

Governing principle:

> Capture reality once. Preserve the source. Structure only what is supported. Ask humans only when ambiguity matters.

## Layer 1 — immutable source evidence
Every capture should preserve the source before interpretation.

Minimum source-artifact properties:
- source type
- original text/image/audio/file reference
- who supplied/captured it when known
- captured timestamp
- source surface (quick sheet, voice, website, email, manual, import)
- original structured fields when the source itself was a form
- processing state

The original source must not be replaced by AI interpretation.

## Layer 2 — candidate interpretation
Interpretation produces candidates, not business truth.

Candidate dimensions include:
- customer / company
- contact person
- phone / email
- Engagement name
- Engagement type
- event/project dates
- venue/location
- setup/access information
- literal customer request
- mentioned service categories
- possible specific resources
- known facts
- material unknowns
- next move
- waiting-on/blocker
- potential existing Party/Engagement matches

Each candidate should carry provenance and, when produced by AI, confidence/epistemic status.

## Layer 3 — matching before creation
The system should attempt deterministic matching before creating duplicates.

High-value match signals:
- exact email
- exact phone
- exact/normalized organization name
- existing customer + event/project date
- existing venue
- existing Engagement with same customer/project/date

Ambiguous matches must not silently merge records.

## Layer 4 — Shared Reality projection
Supported capture information projects into existing canonical objects:

### Engagement
- name
- type
- literal customer_request
- event_start / event_end where sufficiently precise
- venue_name / venue_address where sufficiently supported
- next_action / next_action_at
- waiting_on / blocked_reason

### Parties
- organization/customer
- primary contact
- planner/referrer/venue contact when explicit

### Facts
- customer requests
- requirements
- constraints
- observations
- setup/access/logistics
- service mentions
- unknown/requested information

### Resources
Broad phrases such as “audio” or “video wall” are capability/service mentions, not automatic asset reservations.
Specific equipment references may become candidate resource links, but linking still does not prove availability or reserve capacity.

### Events
Every material projection/change should remain legible in the event ledger.

## Layer 5 — ambiguity gate
The system should ask a human only when the answer materially changes what happens next.

Examples worth interrupting Greg for:
- date could be April 4 or April 9
- customer identity matches two existing organizations
- quote cannot be meaningfully prepared without audience size
- venue/power limitation changes feasible solution
- requested screen conflicts with known physical constraints

Examples generally not worth interrupting Greg for immediately:
- capitalization
- formatting
- missing optional company spelling detail
- unneeded resource serial numbers
- internal category labels

Unknown is a valid stored state.

## Quick Lead Sheet mapping
The physical sheet maps into the Capture Contract as follows:

- Received / Time / Taken By -> source provenance
- Company / Customer -> organization candidate
- Contact Person / Phone / Email -> person/contact candidate
- Event / Project Name -> Engagement-name candidate
- Type -> Engagement-type candidate
- What are they asking for? -> literal customer request
- Event / Project Date(s) -> date candidates
- Venue / Location -> venue candidate
- Setup / Access -> LOGISTICS observation/candidate
- What They Mentioned -> customer-request/service/capability candidates
- Notes / What They Said -> original evidence
- Next Move -> next-action candidate
- When -> next-action timing candidate
- Waiting on / blocker -> attention-context candidate

## Website intake mapping
A future Stage Presence website inquiry should use the same Capture Contract rather than email-only delivery.

A minimal public inquiry could capture:
- name
- company
- email
- phone
- event/project date
- location
- what they need
- freeform description

Submission should create a Source Artifact first and then a candidate/new Engagement under tightly scoped server-side rules. Public users must never receive direct authenticated access to Stage Presence business tables.

## Voice intake mapping
A voice note should preserve:
1. original audio where enabled
2. transcript
3. interpretation candidates
4. provenance back to the audio/transcript

Voice-generated claims remain candidates until confidence/evidence permits promotion.

## Photo intake mapping
A photographed Quick Lead Sheet should preserve:
1. original image
2. extracted text/layout
3. candidate field interpretation
4. exact source-region/provenance when technically practical
5. human review only for material ambiguity

The image should never be treated as discarded OCR scaffolding; it is source evidence.

## Safety / authority boundaries
Capture may never by itself:
- commit Stage Presence contractually
- sign a proposal
- accept payment
- reserve scarce capacity
- represent unverified pricing as current authority
- convert a customer equipment request into a verified technical requirement
- merge ambiguous customers silently

## Success metrics
Capture earns expansion if it measurably improves:
- time from incoming opportunity to persistent record
- time from incoming opportunity to first useful next move
- percentage of opportunities not lost to memory/paper/inbox fragmentation
- percentage of records with sufficient provenance
- reduction in Greg manual entry
- reduction in Sean/Nancy reconstruction work
- interruption rate: how often the system has to ask a human for clarification

Preferred direction:

capture once -> preserve evidence -> structure automatically -> review exceptions -> move on

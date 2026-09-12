# Stage Presence Operational Reality Map v1

**Status:** Governing reset for the next Stage Presence phase  
**Date:** 2026-09-12  
**Center:** Operational Clarity

## Purpose

Stage Presence OS should first organize the real company before optimizing intelligence or interface design.

The system must reliably answer:

- What do we own?
- Who do we know?
- What are we selling?
- What did we promise?
- Who is doing the work?
- What are we paying them?
- What equipment is committed?
- When does everything happen?
- What did it cost?
- Did we get paid?

AI, Capture, evidence, files, history, and frontend projections support this operational reality; they do not replace it.

---

## Operational flower

The Stage Presence operational model is organized around six human business realities:

1. **Things** — equipment, inventory, assets, capability
2. **People** — employees, contractors, crew, skills, pay
3. **Relationships** — contacts, organizations, venues, planners, vendors
4. **Work** — jobs/engagements as complete operational packets
5. **Time** — company calendar, job timeline, crew calls, equipment occupancy
6. **Money** — price book, quotes, labor cost, job cost, invoices, cash

Surrounding all six:

- Evidence
- Files
- Communication
- History
- Unknown
- Capture / AI

---

# 1. THINGS — Warehouse / Inventory / Capability

## Current reality

The database contains a meaningful but incomplete inventory/capability picture. Current active resource evidence includes video, audio, rigging, staging, power, lighting, networking, and mixed service/logistics concepts.

Known examples include:

- 17x10 LED trailer
- 12x7 LED trailer
- 10x5 LED trailer
- 32 x 3.9mm LED panels
- 8 LED poster panels
- RCF audio inventory
- Midas M32 / M32R systems
- rigging / truss / lifts
- stage decks / stairs / skirting
- cabling / power / lighting

Current problem: resource identity, physical inventory, sellable capability, service lines, and Goodshuffle catalog concepts are partially blended.

## Desired operating state

Separate conceptually:

### Capability catalog
What Stage Presence can provide or sell.

### Physical inventory / asset register
What physically exists and can be committed, moved, maintained, and utilized.

Inventory should support three practical identity levels:

- Serialized assets
- Quantity inventory
- Consumables / low-value stock

Every meaningful asset should progressively answer:

- identity
- ownership
- quantity
- location
- condition
- availability
- commitments
- usage history
- standard / governed pricing
- purchase / replacement value
- maintenance history
- economic contribution where supported

## Current backend support

Strong primitives already exist:

- `resources`
- `resource_commitments`
- `resource_usage`
- `resource_economic_snapshots`
- resource pricing evidence
- capability read models

## Primary gap

The structures exist, but operational truth is not populated. Resource commitments and actual usage are effectively unused today.

## First intervention

Perform a physical warehouse reality sweep and reconcile it against the current resource catalog before adding major inventory UI.

---

# 2. PEOPLE — Employees / Contractors / Crew / Labor

## Current reality

Known represented team includes:

- Greg Walker
- Sean Stalker
- Nancy
- Bryan Mahanes
- Eric Jennings
- Kevin
- Scott
- Ben
- David
- Rico
- Hank Futch

Current represented rate evidence is sparse. Scott and Ben have draft $80/hour rate profiles; most others have no canonical rate represented.

## Desired operating state

For every person who may work on a job, Stage Presence should know as appropriate:

- person identity
- relationship to company
- role(s)
- capabilities / qualifications
- normal pay arrangement
- approved rate where applicable
- availability
- planned assignment
- planned hours / days
- call time
- actual hours
- actual labor cost

## Current backend support

Strong primitives already exist:

- `team_members`
- `team_member_capabilities`
- `economic_rate_profiles`
- `engagement_assignments`
- `engagement_cost_items`

## Primary gap

Operational adoption. The current database has almost no crew assignments or actual job-cost evidence.

## First intervention

Confirm the real labor registry and make crew assignment + rate snapshot part of completing a real job.

---

# 3. RELATIONSHIPS — Contacts / Organizations / Venues / Partners

## Current reality

The database contains imported Party records and Engagement-party relationships, but Greg has additional contacts and relationship knowledge outside the OS.

Important relationship roles can include:

- customer
- primary contact
- buyer
- payer
- planner
- referrer
- venue contact
- vendor
- subcontractor
- partner

## Desired operating state

One reusable identity per person / organization wherever possible.

Example:

`Larry Gonzales -> Medalist Sports -> multiple jobs`

not a new Larry record for each job.

Each relationship should progressively support:

- phone / email
- organization
- role
- linked jobs
- recent communication
- commercial history
- recurrence
- notes
- relationship value / lifetime contribution where evidence exists

## Current backend support

Strong primitives already exist:

- `parties`
- `engagement_parties`
- relationship summary views
- source evidence

## Primary gap

Capture, deduplication, and population of Greg's actual contact universe.

## First intervention

Relationship sweep: ingest Greg's lists, Goodshuffle history, venues, planners, vendors, and recurring partners; reconcile instead of recreating.

---

# 4. WORK — Complete Job / Engagement Packet

## Center principle

The Job is where Stage Presence operational reality converges.

The internal canonical object can remain `Engagement`, but normal company operation should be understandable as a complete job packet.

## A complete job should support

### Customer / relationship
- customer organization
- primary contact
- billing contact
- planner / venue / technical contacts

### Scope
- customer request
- intended outcome
- Stage Presence promised solution

### Commercial
- quote / versions
- discounts
- accepted price
- signature
- deposit / invoice / outstanding balance

### Equipment
- required capability
- actual physical inventory reservation
- warehouse pull
- actual usage
- return

### Crew
- assigned people
- roles
- planned hours
- rates
- call times
- actual hours / costs

### Timeline
- prep
- travel
- load-in
- setup
- show
- strike
- load-out
- return

### Logistics
- venue
- address
- access
- loading
- parking
- power
- weather
- site contact
- instructions

### Files
- quote
- contract
- COI
- site map
- run of show
- photos
- drawings

### Economics
- revenue
- labor
- fuel
- subcontract
- materials
- travel
- actual direct cost
- contribution where supported

### Cash
- invoice
- payment
- outstanding

### Closeout
- what actually happened
- variance
- issues
- venue memory
- recurring opportunity
- learning

## Current backend support

This is one of the strongest existing areas. Engagements, commercial documents, fulfillment, schedule, assignments, resources, costs, payments, facts, source artifacts, and closeout structures already exist.

## Primary gap

Completeness and operating use, not lack of abstract schema.

## First intervention

Take one real job end-to-end and require explicit representation of each major operational dimension. Unknown is allowed; silent absence is not.

---

# 5. TIME — Company Calendar

## Current reality

Structured schedule evidence already exists for load-in, pickup, load-out, show, prep, return, and other job events.

## Desired operating state

One company calendar that can represent and filter:

- jobs
- load-ins
- shows
- strikes
- pickups
- returns
- warehouse prep
- crew calls
- site visits
- installation days
- quote deadlines
- client follow-up
- payment follow-up
- maintenance
- owner tasks

Views / filters should eventually include:

- Company
- Greg
- Sean
- Nancy
- specific crew
- specific asset
- warehouse

## Current backend support

- `engagement_schedule_items`
- Work items / due dates
- Engagement dates

## Primary gap

Unified calendar read model and normal scheduling workflow.

## First intervention

Build the calendar from existing schedule/work truth only after one complete job workflow is established.

---

# 6. MONEY — Price / Sale / Cost / Cash

## Center principle

Never collapse these four realities:

1. **Price** — what Stage Presence intends to charge
2. **Sale** — what the customer agreed to
3. **Cost** — what delivery costs Stage Presence
4. **Cash** — what actually moved

## Price book

The price book must eventually govern:

- equipment / deployment rates
- services
- labor sell rates
- delivery / pickup
- programming
- content creation
- travel
- subcontracting
- day/week/month pricing
- overtime
- discount authority
- long-term deployment
- installation / financing structures

Pricing should preserve distinct evidence for:

- historical reference
- direct cost
- economic floor
- commercial floor
- target price
- customer-specific / value-supported price
- final negotiated price

Conflicting pricing evidence should be surfaced, not silently reconciled.

## Job economics

Every completed job should eventually support:

- agreed revenue
- planned direct cost
- actual direct cost
- labor cost
- fuel
- subcontract
- materials
- travel
- contribution where supported

## Cash

Separately:

- invoiced
- collected
- outstanding
- payment date/source

## Current backend support

- commercial documents and lines
- pricing / rate governance
- cost items
- payments
- economy views

## Primary gap

The database has commercial-document evidence, but structured job costs and structured payments are barely/unpopulated.

## First intervention

For the first complete operational job, capture actual crew cost and actual payment evidence instead of deriving them from document state.

---

# Cross-pollination

The system becomes operationally useful when the six domains connect:

- Equipment x Jobs -> what is required / committed
- Equipment x Time -> availability
- Equipment x Money -> utilization and economics
- People x Jobs -> staffing
- People x Time -> availability / call time
- People x Money -> labor cost
- Relationships x Jobs -> customer history
- Relationships x Money -> account value
- Jobs x Time -> operational calendar
- Jobs x Money -> profitability / collection
- Jobs x History -> next-year memory and learning

---

# Supporting membrane

## Evidence / Sources
Original files, Goodshuffle, photos, emails, forms, notes, and human confirmations remain evidence. Evidence does not automatically become canonical truth.

## Files
Files remain original artifacts; the database references them.

## Communication
Original providers remain authority for original communication. Stage Presence OS may store references, summaries, and extracted candidates.

## Unknown
Unknown is a first-class state. Missing data should not be replaced by guesses.

## AI / Capture
AI should reduce the labor of establishing and maintaining reality. It should propose structure and detect discrepancies, but not silently manufacture verified business truth.

---

# Operational Reality Map audit fields

For each business domain, maintain:

- Current Reality
- Current Data
- Authority
- Confidence
- Missing
- Conflicting
- Desired Operating State
- Backend Support
- Needed Change

This map, not feature enthusiasm, should drive roadmap priority.

---

# Immediate evidence snapshot — 2026-09-12

Live database snapshot at the time of this reset:

- 102 active resource records
- 11 active team members
- 20 parties
- 30 active engagements
- 40 schedule items
- 30 commercial documents
- 208 commercial document lines
- 36 source artifacts
- 21 locations
- 1 engagement assignment
- 0 resource commitments
- 0 resource usage records
- 0 engagement cost items
- 0 structured commercial payment records
- 0 engagement closeouts

Interpretation:

> Stage Presence OS already contains meaningful business knowledge and strong operational primitives, but normal company operation is not yet flowing through the operational records that would create clarity.

---

# New governing milestone

## Stage Presence Operational Core v1

Success is not a prettier frontend.

Success means:

> One real Stage Presence job can move from first contact through commercial agreement, equipment commitment, crew assignment, calendar, delivery, actual costs, payment, and closeout without reconstructing reality from memory.

Required dimensions for the first complete job:

- Company / customer
- Contacts
- Job
- Quote
- Pricing
- Equipment
- Reservation / commitment
- Crew
- Crew rates
- Calendar
- Job sheet / logistics
- Warehouse pull
- Actual equipment
- Actual labor
- Costs
- Invoice
- Payment
- Closeout
- Relationship history

Unknown values are acceptable. Silent omission is not.

---

# Reality onboarding sweeps

Run these in parallel with complete-job testing:

1. **Warehouse Sweep** — physically verify the equipment reality.
2. **People Sweep** — confirm team, role, capability, rate/pay relationship.
3. **Relationship Sweep** — ingest and reconcile Greg's contacts and organizations.
4. **Price Sweep** — place historical/current prices and pricing rules side by side for human governance.

AI/Capture may accelerate each sweep, but the human-confirmed operational reality remains authoritative.

---

# What is frozen during this reset

Until the Operational Core is coherent:

- no major frontend redesign
- no new role-mode optimization
- no AI expansion for its own sake
- no unsupported utilization/profitability claims
- no destructive schema cleanup merely for elegance

Existing UI remains transitional tooling over the current backend.

The roadmap should now be earned by operational reality.
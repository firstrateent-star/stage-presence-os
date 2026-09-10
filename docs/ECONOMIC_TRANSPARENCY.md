# Stage Presence Economic Transparency

## Center

Stage Presence OS should make money understandable without pretending to be the general ledger.

The economic model therefore separates:

**price → revenue → invoice → collection → balance owed → direct cost → contribution → company funds**

These are related realities, not interchangeable numbers.

Constitution:

- quoted/proposed value != committed revenue;
- committed revenue != invoiced amount;
- invoiced amount != collected cash;
- collected cash != cash currently in the bank;
- direct job cost != company overhead;
- contribution != accounting profit;
- historical rate != current reusable rate;
- reusable rate profile != the cost a historical job actually incurred;
- missing cost evidence != $0 cost;
- document payment snapshot != live accounting truth;
- unknown is legitimate data.

## 1. Revenue source transparency

`engagement_revenue_sources_v` exposes the current primary commercial document at line level.

It answers:

> Where is the money on this Engagement coming from?

Each line retains its commercial description, group, quantity, resource link where earned, unit/effective/gross value, line discount and a presentation bucket:

- EQUIPMENT
- SERVICE
- LOGISTICS
- CUSTOM_PACKAGE
- DISCOUNT
- OTHER

Document-level discount, tax and processing fee remain separate from line values. The system does not manufacture synthetic line items merely to make totals reconcile.

The current source-document selection prefers current signed/paid invoice truth, then committed contract/order truth, then signed quote truth, then open quote truth. Superseded/void documents are excluded.

## 2. Money position

`engagement_money_position_v` separates:

- proposal value observed;
- committed revenue observed;
- invoiced value observed;
- collected value observed;
- outstanding balance observed;
- represented payment schedule amount;
- represented overdue scheduled amount;
- primary commercial document;
- cash evidence type and as-of date.

Cash evidence states:

- `PAYMENT_RECORDS`
- `FINANCIAL_FACT_SNAPSHOT`
- `DOCUMENT_SNAPSHOT`
- `UNKNOWN`

A Goodshuffle invoice snapshot can therefore say that $X was observed collected / owed as of a date without claiming that the figure is the current bank or accounting balance.

## 3. Direct job costs

`engagement_cost_items` remains the canonical directly caused Engagement cost record.

States:

- ESTIMATE
- COMMITTED
- ACTUAL
- CANCELLED

Categories now include:

- LABOR
- SUBCONTRACT
- EQUIPMENT_RENTAL
- EQUIPMENT_OWNERSHIP
- TRANSPORT
- TRAVEL
- LODGING
- PER_DIEM
- FUEL
- MATERIALS
- PURCHASE
- MAINTENANCE
- PROCESSING_FEE
- OVERHEAD_ALLOCATED
- OTHER

A cost can optionally point to the Resource, contributor, vendor/counterparty, commercial line, fulfillment line, assignment and reusable economic rate profile that caused it.

When a reusable rate is used, the job-level record snapshots `applied_rate`, `rate_basis` and final `amount`. Later changes to the reusable profile therefore do not rewrite old job economics.

`engagement_cost_breakdown_v` presents these costs as economic buckets such as labor, assets/equipment, subcontract, logistics/travel, materials, fees and explicitly allocated overhead.

## 4. Reusable effective-dated cost assumptions

`economic_rate_profiles` stores adjustable company assumptions separately from job history.

A profile has:

- stable profile key + version;
- DRAFT / APPROVED / RETIRED state;
- cost domain;
- rate kind;
- scope;
- unit basis;
- amount/currency;
- effective-from / effective-through dates;
- certainty, rationale and provenance;
- approval evidence.

Cost domains include asset, labor, subcontract, logistics, travel, materials, fees, overhead and other.

Rate kinds include internal cost, external cost, ownership allocation, maintenance reserve, replacement reference, pay, burdened cost and other.

Profiles can eventually scope to a Resource, contributor, Party/vendor, role, category or general company assumption.

`economic_rate_current_v` exposes only APPROVED profiles effective today.

No rate profiles are seeded merely from plausible assumptions. Stage Presence can add them as reality and governance earn them.

## 5. Asset economics

Owned equipment creates real economic consumption even when no vendor invoice occurs.

The model therefore supports Resource-scoped rate profiles such as:

- ownership allocation per event/day;
- maintenance reserve;
- replacement reference;
- external rental/substitution cost.

These are internal economic assumptions, not automatically tax depreciation, GAAP accounting or market value.

An Engagement may then record `EQUIPMENT_OWNERSHIP` as a direct-cost estimate/actual using the applicable rate snapshot.

## 6. Labor economics

Labor rates can change over time without rewriting prior work.

The rate-profile model can scope labor cost by:

- individual contributor when real contributor records exist;
- external Party/vendor;
- role;
- category/general assumption.

Billable client pricing remains in `pricing_rules`; internal labor cost belongs in `economic_rate_profiles`. The two must not be collapsed.

## 7. Contribution, not profit

`engagement_economy_v` combines commercial position, collections, revenue-source lines and direct costs.

It may show:

- projected contribution when a proposal/commitment and supported estimated direct cost exist;
- actual contribution when supported committed revenue and actual direct cost exist;
- contribution margin where those values support it.

It does **not** call this profit.

General operating overhead is not included unless explicitly allocated to an Engagement. Tax/accounting profit should remain an accounting-system concern.

Economy states include:

- PROGRAM_ALLOCATION_UNKNOWN
- ACTUAL_CONTRIBUTION_SUPPORTED
- PROJECTED_CONTRIBUTION_SUPPORTED
- REVENUE_VISIBLE_COSTS_UNPOPULATED
- COMMERCIAL_VALUE_ONLY
- PARTIAL_OR_UNKNOWN

## 8. Company funds

Collections across jobs are not the same thing as current company funds.

`financial_accounts` + append-oriented `financial_account_snapshots` provide a future integration/manual-evidence seam for bank, cash, credit and loan accounts.

Normalized snapshot convention:

- positive balance = value available/owned by Stage Presence;
- negative balance = obligation owed by Stage Presence.

`financial_account_current_v` exposes only the latest represented snapshot for each active account.

No account records or balances are invented in the initial migration.

Until real account evidence exists, the frontend must say **funds not represented** rather than equating collected revenue with cash-on-hand.

## 9. Company operating economy

`economy_overview_v` provides the company-level presentation contract for:

- open proposal value observed;
- committed revenue observed;
- invoiced value observed;
- collected value observed;
- outstanding value observed;
- direct cost estimate/committed/actual where known;
- contribution where supportable;
- evidence coverage counts;
- unresolved program allocations;
- optional liquid funds / liabilities / net account position when account snapshots exist.

The view intentionally carries evidence coverage next to the totals so a large number cannot hide weak completeness.

## 10. Frontend presentation

The presentation architecture remains:

**backend truth → business read model → presentation model → visual surface**

Top-level `Economy` should answer only:

- What is in the pipeline?
- What is committed?
- What has been observed collected?
- What is represented as outstanding?
- Do we know actual company funds?
- How much of the job portfolio has cost evidence?
- Is contribution supportable yet?

Engagement `Money` should answer:

- What is this job worth commercially?
- What document supports that?
- Where does the revenue come from line by line?
- What was collected / is owed, and as of when?
- What direct costs are estimated, committed and actual?
- What contribution is supportable?

Deep revenue lines and cost records live behind progressive disclosure.

## 11. Reality capture

The initial frontend may manually capture direct job costs because this creates high-value missing evidence immediately.

Manual cost capture must not:

- change the client quote;
- create a reusable rate automatically;
- infer a vendor/contributor/resource that was not selected;
- delete history when corrected.

Corrections cancel the prior cost record; future refinements can introduce explicit replacement lineage if repeated use demonstrates the need.

## 12. Current evidence boundary — 2026-09-10

At migration time:

- 30 active Engagement economies
- 208 line-level revenue-source rows
- about $89.8k observed open proposal value
- about $127.8k supported committed revenue
- about $56.3k observed collected
- about $71.5k represented outstanding
- 0 direct cost items
- 0 economic rate profiles
- 0 financial accounts / account snapshots
- 0 Engagements with supported actual contribution
- 6 UNC component Engagements still `PROGRAM_ALLOCATION_UNKNOWN`

These totals are operating evidence, not audited financial statements.

## 13. Expansion path

Reality should now determine the next economic petals:

1. capture real job costs while work happens;
2. observe repeated labor/asset/logistics cost patterns;
3. promote stable patterns into governed effective-dated rate profiles;
4. connect vendor/accounting/payment evidence where it removes repeated entry;
5. connect real account balances when Stage Presence wants cash/liability visibility;
6. use actual job outcomes to improve pricing, resource ownership decisions and staffing;
7. preserve a clean boundary between Stage Presence operating economics and formal accounting/tax truth.

The desired loop is:

**sell value → collect cash → consume capability → record cost → understand contribution → learn → price/source/operate better next time.**

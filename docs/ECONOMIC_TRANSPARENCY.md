# Stage Presence Economic Transparency

## Center

Stage Presence OS should make money understandable without pretending to be the general ledger.

The operating economy is four connected but distinct layers:

**Engagement economics + company operating costs + asset economics + funds/accounts**

Inside one Engagement, value moves through:

**price → revenue source → invoice → collection → balance owed → direct cost → contribution**

Constitution:
- quoted/proposed value != committed revenue;
- committed revenue != invoiced amount;
- invoiced amount != collected cash;
- aggregate collected snapshot != payment transaction ledger;
- collected cash != cash currently in the bank;
- direct job cost != company operating cost;
- operational Resource inventory != asset economic value;
- contribution != accounting profit;
- historical rate != current reusable rate;
- reusable rate profile != the cost a historical job actually incurred;
- missing cost evidence != $0 cost;
- document payment snapshot != live accounting truth;
- unknown is legitimate data.

## 1. Revenue source transparency

`engagement_revenue_sources_v` exposes the current primary commercial document at line level and answers:

> Where is the money on this Engagement coming from?

Each line retains description, group, quantity, Resource link where earned, unit/effective/gross value, line discount and a presentation bucket:
- EQUIPMENT
- SERVICE
- LOGISTICS
- CUSTOM_PACKAGE
- DISCOUNT
- OTHER

Document-level discount, tax and processing fee remain separate from line values. The system does not invent synthetic lines merely to force reconciliation.

## 2. Cash baseline + later payment transactions

Historical imports frequently know an aggregate amount collected at a snapshot date but do not contain a complete transaction ledger.

`engagement_cash_position_v` therefore treats imported/document collection amounts as **dated baselines**. `commercial_payments` then represents transaction evidence occurring after that baseline.

Rule:

> **baseline collection snapshot + only later payment transactions = current observed collection position**

This avoids two opposite errors:
- letting the old aggregate always win, which makes later receipts invisible;
- adding every reconstructed payment to the aggregate, which double-counts money already included in history.

Cash evidence states include:
- `BASELINE_PLUS_PAYMENTS`
- `PAYMENT_RECORDS`
- `FINANCIAL_FACT_SNAPSHOT`
- `DOCUMENT_SNAPSHOT`
- `UNKNOWN`

`cash_overlap_state` explicitly identifies older/undated payment rows that should not be added on top of the baseline until reconciled.

The current frontend accepts a new payment only after a dated baseline when one exists. Historical payment reconstruction should use a future reconciliation workflow rather than pretending old receipts are new.

## 3. Money position

`engagement_money_position_v` separates:
- proposal value observed;
- committed revenue observed;
- invoiced value observed;
- collected value observed;
- outstanding balance observed;
- payment schedule/overdue amount where represented;
- primary commercial document;
- collection baseline;
- later incremental payments;
- cash evidence type, overlap state and as-of date.

A Goodshuffle snapshot can therefore say that $X was observed collected/owed as of a date while later Stage Presence OS receipts move the current position without rewriting the historical snapshot.

## 4. Direct job costs

`engagement_cost_items` is the canonical directly caused Engagement cost record.

States:
- ESTIMATE
- COMMITTED
- ACTUAL
- CANCELLED

Categories include labor, subcontract, external equipment rental, owned-equipment allocation, transport, travel, lodging, per diem, fuel, materials, purchase, maintenance, processing fee, allocated overhead and other.

A cost can optionally point to the Resource, contributor, vendor/Party, commercial line, fulfillment line, assignment and reusable economic rate profile that caused it.

When a reusable rate is used, the job record snapshots `applied_rate`, `rate_basis` and final `amount`. Later rate changes therefore do not rewrite old job economics.

## 5. Company operating costs

`company_cost_items` represents costs that belong to Stage Presence as a company rather than being directly caused by one Engagement.

Categories include:
- ADMIN_LABOR
- SOFTWARE
- INSURANCE
- FACILITY
- VEHICLE
- MARKETING
- PROFESSIONAL
- TAX_LICENSE
- FINANCING
- EQUIPMENT
- MAINTENANCE
- UTILITIES
- OFFICE
- TRAINING
- OTHER

States remain ESTIMATE / COMMITTED / ACTUAL / CANCELLED.

Optional links can connect a company cost to a Party/vendor, financial account, Resource or reusable rate profile without forcing the expense onto a job.

`company_cost_breakdown_v` provides readable operating buckets while preserving evidence state.

A missing company-cost record is not interpreted as zero overhead. `economy_overview_v` reports explicit coverage state instead.

## 6. Reusable effective-dated cost assumptions

`economic_rate_profiles` stores adjustable future-facing assumptions separately from job history.

A profile has stable family key + version, DRAFT/APPROVED/RETIRED state, domain/kind/scope, unit basis, amount/currency, effective period, certainty/rationale/provenance and approval evidence.

Domains include asset, labor, subcontract, logistics, travel, materials, fees, overhead and other.

Rate kinds include internal cost, external cost, ownership allocation, maintenance reserve, replacement reference, pay, burdened cost and other.

Profiles may scope to Resource, contributor, Party/vendor, role, category or general company assumption.

`economic_rate_current_v` exposes only APPROVED profiles effective today.

The frontend creates **DRAFT profiles only**. It does not approve them and does not automatically apply them to Engagements.

## 7. Asset economics

Operational Resource truth and economic asset truth are separate.

`resource_economic_snapshots` is an append-oriented evidence layer that can represent:
- ownership state: OWNED / FINANCED / LEASED / RENTED / BORROWED / UNKNOWN;
- represented quantity;
- acquired-on date;
- acquisition cost;
- current value estimate;
- replacement cost;
- financing balance;
- annual maintenance estimate;
- certainty and provenance.

`resource_economy_current_v` exposes the latest represented snapshot per Resource.

A later valuation creates another snapshot rather than rewriting history. These values are operating estimates unless their evidence says otherwise; they are not automatically tax depreciation, GAAP book value or appraised market value.

Owned-equipment consumption on a job can still be represented separately as an `EQUIPMENT_OWNERSHIP` direct cost using an applicable rate snapshot.

## 8. Labor economics

Labor costs can change over time without rewriting prior jobs.

Reusable rate profiles can eventually scope labor cost by contributor, external Party/vendor, role, category or general assumption. Client-facing pricing remains in `pricing_rules`; internal labor cost belongs in `economic_rate_profiles`. Those must not collapse into one number.

## 9. Contribution, not profit

`engagement_economy_v` combines commercial position, collections, revenue-source lines and direct costs.

It may show projected contribution when supported estimate cost exists and actual contribution when supported committed revenue + actual direct cost exist.

It does **not** call this profit.

Company operating costs, financing, taxes and incomplete asset/funds evidence are not silently included or excluded to create a deceptively precise company-profit number.

Economy states include:
- PROGRAM_ALLOCATION_UNKNOWN
- ACTUAL_CONTRIBUTION_SUPPORTED
- PROJECTED_CONTRIBUTION_SUPPORTED
- REVENUE_VISIBLE_COSTS_UNPOPULATED
- COMMERCIAL_VALUE_ONLY
- PARTIAL_OR_UNKNOWN

## 10. Company funds

Collections across jobs are not current company funds.

`financial_accounts` + append-oriented `financial_account_snapshots` represent bank, cash, credit, loan and other account evidence.

Normalized balance convention:
- positive = value available/owned by Stage Presence;
- negative = obligation owed by Stage Presence.

The frontend allows users to enter a liability as a positive amount owed and stores the normalized negative balance internally.

`financial_account_current_v` exposes only the latest represented snapshot for each active account.

Until account evidence exists, the frontend says **funds not represented** rather than equating collected revenue with cash-on-hand.

## 11. Company operating economy

`economy_overview_v` is the company-level presentation contract for:
- open proposal value;
- committed revenue;
- invoiced value;
- collected value;
- outstanding value;
- direct job cost estimates/commitments/actuals;
- contribution where supportable;
- cost evidence coverage;
- unresolved program allocations;
- liquid funds / liabilities / net account position when represented;
- company operating-cost evidence/YTD totals;
- current asset value / replacement / financing / maintenance evidence;
- explicit overall operating-economy evidence state.

The view intentionally carries evidence coverage next to totals so a large dollar amount cannot hide weak completeness.

## 12. Frontend presentation

Presentation architecture remains:

**backend truth → business read model → presentation model → visual surface**

Top-level Economy answers:
- What is in the pipeline?
- What is committed?
- What has been observed collected?
- What is represented as outstanding?
- Do we know actual funds?
- How much job-cost evidence exists?
- What company costs are represented?
- What asset economics are represented?
- Is contribution supportable?
- What is the strongest missing evidence layer?

Heavy structure is progressively disclosed under:
- Accounts + funds
- Company operating costs
- Asset economics
- Cost rates + assumptions

Engagement Money answers:
- What is the job worth commercially?
- What document supports it?
- Where does revenue come from line by line?
- What collection baseline existed, and what later payments moved it?
- What is currently represented as owed?
- What direct costs are estimated, committed and actual?
- What contribution is supportable?

## 13. Reality capture rules

Manual capture is allowed because it creates high-value missing evidence immediately, but it must preserve semantic boundaries.

Manual job cost capture must not change the client quote or create an approved reusable rate.

Company-cost capture must not silently allocate itself across jobs.

Asset snapshots append rather than edit prior economic evidence.

Account snapshots append rather than mutate earlier balances.

Rate creation from the Economy UI creates DRAFT assumptions only.

Payment capture must apply to a canonical commercial document and, when an aggregate baseline exists, must be strictly later than the baseline date. UNC component Engagements with unresolved program allocation do not expose misleading payment capture.

Corrections to current cost capture cancel the prior record instead of deleting it.

## 14. Current evidence boundary — 2026-09-10

Current represented reality:
- 30 active Engagements
- 208 commercial document lines
- 208 fulfillment lines
- about $89.8k observed open proposal value
- about $127.8k supported committed revenue
- about $56.3k observed collected
- about $71.5k represented outstanding
- 0 persisted payment transaction rows
- 0 direct job cost items
- 0 company operating-cost items
- 0 economic rate profiles
- 0 financial accounts / snapshots
- 0 asset economic snapshots
- 0 Engagements with supported actual contribution
- 6 UNC component Engagements remain `PROGRAM_ALLOCATION_UNKNOWN`

A transactional verification inserted a temporary $1,000 Sep 10 payment against the UNC season Sep 9 baseline. The views correctly moved $51,000 collected / $51,000 outstanding to $52,000 / $50,000 with `BASELINE_PLUS_PAYMENTS`, then the transaction was rolled back.

These totals are operating evidence, not audited financial statements.

## 15. Expansion path

Reality should determine subsequent economic petals:
1. capture real direct job costs while work happens;
2. enter current company operating costs where useful;
3. enter actual account snapshots if cash/liability visibility is desired;
4. add asset snapshots first for economically important/scarce assets, not every cable;
5. observe repeated labor/asset/logistics cost patterns;
6. promote stable patterns into governed effective-dated rate profiles;
7. connect accounting/payment/bank evidence where integration removes repeated entry;
8. use outcomes to improve pricing, sourcing, ownership and staffing;
9. preserve the boundary between Stage Presence operating economics and formal accounting/tax truth.

Desired loop:

**sell value → preserve baseline → collect later cash → consume capability → record direct cost → record company/asset/funds reality → understand supported contribution → learn → price/source/operate better next time.**

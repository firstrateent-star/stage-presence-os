-- Stage Presence OS — frontend operating read contracts
-- 2026-09-09
--
-- Lightweight list surfaces and a complete internal Engagement workspace.
-- Every view is SECURITY INVOKER so underlying member RLS remains authoritative.

begin;

create or replace view public.engagement_economics_v
with (security_invoker=true)
as
with latest_facts as (
  select distinct on (engagement_id, fact_type) engagement_id,fact_type,amount,certainty_state,effective_date,updated_at
  from public.engagement_financial_facts
  order by engagement_id,fact_type,effective_date desc nulls last,updated_at desc
), fact_rollup as (
  select engagement_id,
    max(amount) filter (where fact_type='QUOTE_TOTAL') as quote_total_fact,
    max(amount) filter (where fact_type='CONTRACT_TOTAL') as contract_total_fact,
    max(amount) filter (where fact_type='AMOUNT_COLLECTED') as amount_collected_fact,
    max(amount) filter (where fact_type='DIRECT_COST_ESTIMATE') as direct_cost_estimate_fact,
    max(amount) filter (where fact_type='DIRECT_COST_ACTUAL') as direct_cost_actual_fact
  from latest_facts group by engagement_id
), allocation_unknown as (
  select distinct engagement_id from public.engagement_facts
  where label='Per-game economic allocation' and certainty_state='UNKNOWN'
), current_docs as (
  select d.* from public.commercial_documents d
  where d.document_state <> 'VOID'
    and not exists (select 1 from public.commercial_documents newer where newer.supersedes_document_id=d.id and newer.document_state <> 'VOID')
), doc_rollup as (
  select engagement_id,
    max(coalesce(grand_total,total)) filter (where document_type='QUOTE' and document_state in ('DRAFT','SENT','UNSIGNED')) as open_quote_value,
    max(coalesce(grand_total,total)) filter (where document_type='QUOTE' and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as signed_quote_value,
    max(coalesce(grand_total,total)) filter (where document_type in ('CONTRACT','ORDER') and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as contract_document_value,
    sum(coalesce(grand_total,total,0)) filter (where document_type='INVOICE' and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as invoice_document_value,
    sum(coalesce(amount_paid,0)) filter (where document_type='INVOICE' and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as invoice_amount_paid,
    sum(coalesce(remaining_balance,0)) filter (where document_type='INVOICE' and document_state in ('SIGNED','PARTIALLY_PAID')) as invoice_remaining,
    max(coalesce(remaining_balance,0)) filter (where document_type in ('CONTRACT','ORDER') and document_state in ('SIGNED','PARTIALLY_PAID')) as contract_remaining,
    max(coalesce(amount_paid,0)) filter (where document_type in ('CONTRACT','ORDER') and document_state in ('SIGNED','PARTIALLY_PAID','PAID')) as contract_amount_paid
  from current_docs group by engagement_id
), payment_rollup as (
  select d.engagement_id,sum(coalesce(p.applied_amount,p.charged_amount,0)) as applied_payments
  from public.commercial_payments p join public.commercial_documents d on d.id=p.commercial_document_id
  where coalesce(p.status,'') not in ('VOID','FAILED','REFUNDED') group by d.engagement_id
), cost_rollup as (
  select engagement_id,
    sum(amount) filter (where cost_state='ESTIMATE') as estimated_cost_items,
    sum(amount) filter (where cost_state='COMMITTED') as committed_cost_items,
    sum(amount) filter (where cost_state='ACTUAL') as actual_cost_items,
    count(*) filter (where cost_state <> 'CANCELLED') as cost_item_count
  from public.engagement_cost_items group by engagement_id
), base as (
  select e.*,fr.quote_total_fact,fr.contract_total_fact,fr.amount_collected_fact,fr.direct_cost_estimate_fact,fr.direct_cost_actual_fact,
    dr.open_quote_value,dr.signed_quote_value,dr.contract_document_value,dr.invoice_document_value,dr.invoice_amount_paid,dr.invoice_remaining,dr.contract_remaining,dr.contract_amount_paid,
    pr.applied_payments,cr.estimated_cost_items,cr.committed_cost_items,cr.actual_cost_items,cr.cost_item_count,
    (au.engagement_id is not null) as allocation_is_unknown
  from public.engagements e
  left join fact_rollup fr on fr.engagement_id=e.id
  left join allocation_unknown au on au.engagement_id=e.id
  left join doc_rollup dr on dr.engagement_id=e.id
  left join payment_rollup pr on pr.engagement_id=e.id
  left join cost_rollup cr on cr.engagement_id=e.id
  where e.archived_at is null
), valued as (
  select b.*,
    case when allocation_is_unknown and contract_total_fact is null and coalesce(contract_document_value,invoice_document_value,signed_quote_value)=0 then null
         else coalesce(contract_total_fact,contract_document_value,invoice_document_value,signed_quote_value) end as committed_revenue_value,
    case when allocation_is_unknown and quote_total_fact is null and coalesce(open_quote_value,estimated_value)=0 then null
         else coalesce(quote_total_fact,open_quote_value,estimated_value) end as proposal_value,
    case when allocation_is_unknown and amount_collected_fact is null and applied_payments is null then null
         else coalesce(amount_collected_fact,applied_payments,case when invoice_document_value is not null then invoice_amount_paid else contract_amount_paid end) end as collected_value,
    case when allocation_is_unknown then null when invoice_document_value is not null then invoice_remaining else contract_remaining end as remaining_value
  from base b
)
select id as engagement_id,engagement_number,name as engagement_name,engagement_type,commercial_state,commitment_state,
  committed_revenue_value as committed_revenue_observed,proposal_value as proposal_value_observed,
  case when allocation_is_unknown and committed_revenue_value is null then 'PROGRAM_ALLOCATION_UNKNOWN'
       when contract_total_fact is not null then 'FINANCIAL_FACT_CONTRACT_TOTAL'
       when contract_document_value is not null then 'CURRENT_CONTRACT_OR_ORDER'
       when invoice_document_value is not null then 'CURRENT_INVOICE_TOTAL'
       when signed_quote_value is not null then 'SIGNED_QUOTE'
       when quote_total_fact is not null then 'FINANCIAL_FACT_QUOTE_TOTAL'
       when open_quote_value is not null then 'OPEN_QUOTE'
       when estimated_value is not null then 'ENGAGEMENT_ESTIMATE' else 'UNKNOWN' end as value_basis,
  collected_value as collected_observed,remaining_value as remaining_balance_observed,
  coalesce(direct_cost_estimate_fact,estimated_cost_items) as direct_cost_estimate_observed,
  committed_cost_items as direct_cost_committed_observed,
  coalesce(direct_cost_actual_fact,actual_cost_items) as direct_cost_actual_observed,cost_item_count,
  case when committed_revenue_value is not null and coalesce(direct_cost_actual_fact,actual_cost_items) is not null then committed_revenue_value-coalesce(direct_cost_actual_fact,actual_cost_items) end as contribution_observed,
  case when coalesce(committed_revenue_value,proposal_value) is not null and coalesce(direct_cost_estimate_fact,estimated_cost_items) is not null then coalesce(committed_revenue_value,proposal_value)-coalesce(direct_cost_estimate_fact,estimated_cost_items) end as projected_contribution_observed,
  case when direct_cost_actual_fact is not null then 'AGGREGATE_ACTUAL_COST_FACT'
       when actual_cost_items is not null then 'ACTUAL_COST_LINE_ITEMS_MAY_BE_PARTIAL'
       when direct_cost_estimate_fact is not null then 'AGGREGATE_COST_ESTIMATE'
       when estimated_cost_items is not null then 'ESTIMATED_COST_LINE_ITEMS_MAY_BE_PARTIAL'
       else 'NO_DIRECT_COST_EVIDENCE' end as cost_evidence_state
from valued;

create or replace view public.resource_commitment_current_v with (security_invoker=true) as
select rc.id,rc.engagement_id,e.engagement_number,e.name as engagement_name,rc.resource_id,r.name as resource_name,r.category as resource_category,r.quantity as library_quantity,r.quantity_state,rc.commitment_type,rc.commitment_state,rc.quantity,rc.from_date,rc.through_date,rc.planned_sourcing_model,rc.certainty_state,rc.fulfillment_plan_line_id,rc.commercial_document_line_id,rc.notes,rc.created_at,rc.updated_at
from public.resource_commitments rc join public.engagements e on e.id=rc.engagement_id join public.resources r on r.id=rc.resource_id
where rc.commitment_state in ('TENTATIVE','CONFIRMED');

create or replace view public.location_memory_v with (security_invoker=true) as
with represented as (
  select l.id as location_id,l.name,l.location_type,l.address,l.city,l.region,l.postal_code,l.country,l.access_notes,l.load_in_notes,l.parking_notes,l.power_notes,l.connectivity_notes,el.engagement_id,e.event_start_date,e.commercial_state,e.commitment_state
  from public.locations l left join public.engagement_locations el on el.location_id=l.id left join public.engagements e on e.id=el.engagement_id and e.archived_at is null where l.active=true
  union all
  select null::uuid,e.venue_name,'VENUE'::text,e.venue_address,null::text,null::text,null::text,'US'::text,null::text,null::text,null::text,null::text,null::text,e.id,e.event_start_date,e.commercial_state,e.commitment_state
  from public.engagements e where e.archived_at is null and e.venue_name is not null and not exists (select 1 from public.engagement_locations el where el.engagement_id=e.id and el.role='VENUE')
)
select location_id,name,location_type,address,city,region,postal_code,country,
  max(access_notes) as access_notes,max(load_in_notes) as load_in_notes,max(parking_notes) as parking_notes,max(power_notes) as power_notes,max(connectivity_notes) as connectivity_notes,
  count(distinct engagement_id) filter (where engagement_id is not null) as engagement_count,
  min(event_start_date) as first_engagement_date,max(event_start_date) as latest_engagement_date,
  count(distinct engagement_id) filter (where event_start_date>=current_date and commercial_state<>'LOST' and commitment_state<>'CANCELLED') as current_future_count
from represented where name is not null group by location_id,name,location_type,address,city,region,postal_code,country;

create or replace view public.relationship_summary_v with (security_invoker=true) as
select p.id as party_id,p.party_type,p.name,p.organization_name,p.email,p.phone,
  count(distinct ep.engagement_id) as engagement_count,
  count(distinct ep.engagement_id) filter (where e.event_start_date>=current_date and e.commercial_state<>'LOST' and e.commitment_state<>'CANCELLED') as current_future_count,
  min(e.event_start_date) as first_engagement_date,max(e.event_start_date) as latest_engagement_date,
  sum(coalesce(ec.committed_revenue_observed,0)) as committed_revenue_observed,
  sum(coalesce(ec.collected_observed,0)) as collected_observed,
  sum(ec.contribution_observed) as contribution_observed_where_known,
  count(*) filter (where ec.contribution_observed is not null) as engagements_with_known_contribution
from public.parties p
left join public.engagement_parties ep on ep.party_id=p.id
left join public.engagements e on e.id=ep.engagement_id and e.archived_at is null
left join public.engagement_economics_v ec on ec.engagement_id=e.id
where p.archived_at is null
group by p.id,p.party_type,p.name,p.organization_name,p.email,p.phone;

create or replace view public.contributor_work_v with (security_invoker=true) as
select tm.id as team_member_id,tm.username,tm.display_name,tm.member_type,tm.primary_role,
  a.id as assignment_id,a.engagement_id,e.engagement_number,e.name as engagement_name,
  a.role_code,a.role_label,a.assignment_state,a.scheduled_start,a.scheduled_end,
  w.id as work_item_id,w.title as work_title,w.action_type,w.status as work_status,w.priority,w.due_at,w.due_date,w.why_now,w.success_condition
from public.team_members tm
left join public.engagement_assignments a on a.team_member_id=tm.id and a.assignment_state not in ('DECLINED','COMPLETED')
left join public.engagements e on e.id=a.engagement_id and e.archived_at is null
left join public.work_items w on w.owner_member_id=tm.id and w.status in ('OPEN','WAITING','BLOCKED') and (w.engagement_id=a.engagement_id or a.id is null)
where tm.active=true;

create or replace view public.engagement_frontend_v with (security_invoker=true) as
select e.id,e.engagement_number,e.name,e.engagement_type,e.customer_request,e.desired_outcome,e.event_start,e.event_end,e.event_start_date,e.event_end_date,e.venue_name,e.venue_address,e.commercial_state,e.commitment_state,e.operational_state,e.attention_state,e.updated_at,
(select to_jsonb(x) from (
  select p.id,p.party_type,p.name,p.organization_name,p.email,p.phone,ep.role
  from public.engagement_parties ep join public.parties p on p.id=ep.party_id
  where ep.engagement_id=e.id and ep.role in ('CUSTOMER','PRIMARY_CONTACT','BUYER','DECISION_MAKER')
  order by case ep.role when 'CUSTOMER' then 1 when 'PRIMARY_CONTACT' then 2 when 'BUYER' then 3 else 4 end,ep.is_primary desc,ep.created_at limit 1
) x) as primary_customer,
(select to_jsonb(d) from (
  select cd.id,cd.document_type,cd.transaction_type,cd.document_state,cd.version_no,cd.document_date,cd.signature_date,cd.sent_at,cd.valid_through,cd.currency,cd.subtotal,cd.discount_total,cd.tax_total,cd.total,cd.grand_total,cd.due_on_signature,cd.due_now,cd.final_due_date,cd.final_due_amount,cd.amount_paid,cd.remaining_balance
  from public.commercial_documents cd
  where cd.engagement_id=e.id and cd.document_state<>'VOID'
    and not exists (select 1 from public.commercial_documents n where n.supersedes_document_id=cd.id and n.document_state<>'VOID')
  order by case cd.document_state when 'PAID' then 1 when 'PARTIALLY_PAID' then 2 when 'SIGNED' then 3 when 'SENT' then 4 when 'UNSIGNED' then 5 when 'DRAFT' then 6 else 7 end,
    coalesce(cd.accepted_at,cd.sent_at,cd.issued_at,cd.snapshot_at,cd.updated_at) desc limit 1
) d) as current_commercial_document,
to_jsonb(ec)-'engagement_id'-'engagement_number'-'engagement_name'-'engagement_type'-'commercial_state'-'commitment_state' as economics,
(select to_jsonb(w) from (
  select wi.id,wi.title,wi.action_type,wi.status,wi.priority,wi.due_at,wi.due_date,wi.waiting_on,wi.why_now,wi.success_condition,wi.next_step_hint,
    tm.username as owner_username,tm.display_name as owner_display_name,rp.name as responsible_party_name
  from public.work_items wi left join public.team_members tm on tm.id=wi.owner_member_id left join public.parties rp on rp.id=wi.responsible_party_id
  where wi.engagement_id=e.id and wi.status in ('OPEN','WAITING','BLOCKED')
  order by case wi.priority when 'NOW' then 1 when 'SOON' then 2 when 'NORMAL' then 3 else 4 end,coalesce(wi.due_at,wi.due_date::timestamptz,'infinity'::timestamptz),wi.created_at limit 1
) w) as next_work,
(select count(*) from public.work_items wi where wi.engagement_id=e.id and wi.status in ('OPEN','WAITING','BLOCKED')) as open_work_count,
(select count(*) from public.fulfillment_plan_lines fl join public.fulfillment_plans fp on fp.id=fl.fulfillment_plan_id where fp.engagement_id=e.id and fp.plan_state='ACTIVE') as fulfillment_line_count,
(select count(*) from public.engagement_assignments a where a.engagement_id=e.id and a.assignment_state in ('REQUESTED','CONFIRMED')) as active_assignment_count,
(select to_jsonb(s) from (
  select si.id,si.schedule_type,si.label,si.start_at,si.end_at,si.start_date,si.end_date,si.time_state,coalesce(l.name,si.location_name) as location_name,coalesce(l.address,si.location_address) as location_address
  from public.engagement_schedule_items si left join public.locations l on l.id=si.location_id
  where si.engagement_id=e.id and coalesce(si.end_at::date,si.end_date,si.start_at::date,si.start_date)>=current_date
  order by coalesce(si.start_at,si.start_date::timestamptz,'infinity'::timestamptz) limit 1
) s) as next_schedule_item,
(select case max(case cps.signal_level when 'HIGH' then 3 when 'WATCH' then 2 else 1 end) when 3 then 'HIGH' when 2 then 'WATCH' when 1 then 'INFO' else null end from public.capacity_pressure_signals cps where cps.engagement_a_id=e.id or cps.engagement_b_id=e.id) as capacity_signal,
(select count(*) from public.source_artifact_segments sas where sas.engagement_id=e.id) as evidence_segment_count
from public.engagements e left join public.engagement_economics_v ec on ec.engagement_id=e.id
where e.archived_at is null;

create or replace view public.engagement_workspace_v with (security_invoker=true) as
select e.*,
  to_jsonb(ec)-'engagement_id'-'engagement_number'-'engagement_name'-'engagement_type'-'commercial_state'-'commitment_state' as economics,
  coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from (
    select ep.id,ep.role,ep.is_primary,ep.notes,ep.created_at,p.id as party_id,p.party_type,p.name,p.organization_name,p.email,p.phone
    from public.engagement_parties ep join public.parties p on p.id=ep.party_id where ep.engagement_id=e.id
  ) x),'[]'::jsonb) as parties,
  coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.engagement_facts f where f.engagement_id=e.id),'[]'::jsonb) as facts,
  coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from (
    select er.*,r.name as resource_name,r.category as resource_category,r.resource_type,r.sourcing_model as library_sourcing_model,r.quantity as library_quantity,r.quantity_state,r.reference_price,r.price_state
    from public.engagement_resources er join public.resources r on r.id=er.resource_id where er.engagement_id=e.id
  ) x),'[]'::jsonb) as resources,
  coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object(
    'lines',coalesce((select jsonb_agg(to_jsonb(l) order by l.sort_order nulls last,l.created_at) from public.commercial_document_lines l where l.commercial_document_id=d.id),'[]'::jsonb),
    'payment_schedule',coalesce((select jsonb_agg(to_jsonb(ps) order by ps.sequence_no nulls last,ps.created_at) from public.commercial_payment_schedule ps where ps.commercial_document_id=d.id),'[]'::jsonb),
    'payments',coalesce((select jsonb_agg(to_jsonb(cp) order by cp.payment_date nulls last,cp.created_at) from public.commercial_payments cp where cp.commercial_document_id=d.id),'[]'::jsonb)
  ) order by d.created_at) from public.commercial_documents d where d.engagement_id=e.id),'[]'::jsonb) as commercial_documents,
  coalesce((select jsonb_agg(to_jsonb(fp)||jsonb_build_object('lines',coalesce((select jsonb_agg(to_jsonb(fl) order by fl.sort_order nulls last,fl.created_at) from public.fulfillment_plan_lines fl where fl.fulfillment_plan_id=fp.id),'[]'::jsonb)) order by fp.created_at) from public.fulfillment_plans fp where fp.engagement_id=e.id),'[]'::jsonb) as fulfillment_plans,
  coalesce((select jsonb_agg(to_jsonb(si)||jsonb_build_object('canonical_location',case when l.id is null then null else jsonb_build_object('id',l.id,'name',l.name,'address',l.address,'location_type',l.location_type) end) order by coalesce(si.start_at,si.start_date::timestamptz,'infinity'::timestamptz)) from public.engagement_schedule_items si left join public.locations l on l.id=si.location_id where si.engagement_id=e.id),'[]'::jsonb) as schedule,
  coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('member',jsonb_build_object('id',tm.id,'username',tm.username,'display_name',tm.display_name,'primary_role',tm.primary_role)) order by a.created_at) from public.engagement_assignments a join public.team_members tm on tm.id=a.team_member_id where a.engagement_id=e.id),'[]'::jsonb) as assignments,
  coalesce((select jsonb_agg(to_jsonb(w)||jsonb_build_object('owner',case when tm.id is null then null else jsonb_build_object('id',tm.id,'username',tm.username,'display_name',tm.display_name) end,'responsible_party',case when rp.id is null then null else jsonb_build_object('id',rp.id,'name',rp.name,'organization_name',rp.organization_name) end) order by case w.status when 'OPEN' then 1 when 'WAITING' then 2 when 'BLOCKED' then 3 else 4 end,w.created_at) from public.work_items w left join public.team_members tm on tm.id=w.owner_member_id left join public.parties rp on rp.id=w.responsible_party_id where w.engagement_id=e.id),'[]'::jsonb) as work_items,
  coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.engagement_cost_items c where c.engagement_id=e.id),'[]'::jsonb) as cost_items,
  coalesce((select jsonb_agg(to_jsonb(rc)||jsonb_build_object('resource_name',r.name) order by rc.created_at) from public.resource_commitments rc join public.resources r on r.id=rc.resource_id where rc.engagement_id=e.id),'[]'::jsonb) as resource_commitments,
  coalesce((select jsonb_agg(to_jsonb(ru)||jsonb_build_object('resource_name',r.name) order by ru.created_at) from public.resource_usage ru join public.resources r on r.id=ru.resource_id where ru.engagement_id=e.id),'[]'::jsonb) as resource_usage,
  coalesce((select jsonb_agg(to_jsonb(o) order by o.output_type,o.version_no,o.created_at) from public.engagement_outputs o where o.engagement_id=e.id),'[]'::jsonb) as outputs,
  coalesce((select jsonb_agg(to_jsonb(el)||jsonb_build_object('location',to_jsonb(l)) order by el.is_primary desc,el.created_at) from public.engagement_locations el join public.locations l on l.id=el.location_id where el.engagement_id=e.id),'[]'::jsonb) as locations,
  coalesce((select jsonb_agg(jsonb_build_object('direction','FROM','relationship',to_jsonb(r),'other_engagement',jsonb_build_object('id',oe.id,'engagement_number',oe.engagement_number,'name',oe.name)) order by r.created_at) from public.engagement_relationships r join public.engagements oe on oe.id=r.to_engagement_id where r.from_engagement_id=e.id),'[]'::jsonb)
  || coalesce((select jsonb_agg(jsonb_build_object('direction','TO','relationship',to_jsonb(r),'other_engagement',jsonb_build_object('id',oe.id,'engagement_number',oe.engagement_number,'name',oe.name)) order by r.created_at) from public.engagement_relationships r join public.engagements oe on oe.id=r.from_engagement_id where r.to_engagement_id=e.id),'[]'::jsonb) as relationships,
  coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('artifact',jsonb_build_object('id',sa.id,'artifact_type',sa.artifact_type,'original_filename',sa.original_filename,'mime_type',sa.mime_type,'storage_path',sa.storage_path,'reference',sa.reference,'processing_state',sa.processing_state,'metadata',sa.metadata)) order by s.created_at) from public.source_artifact_segments s join public.source_artifacts sa on sa.id=s.source_artifact_id where s.engagement_id=e.id),'[]'::jsonb) as evidence,
  (select to_jsonb(c) from public.engagement_closeouts c where c.engagement_id=e.id) as closeout
from public.engagements e left join public.engagement_economics_v ec on ec.engagement_id=e.id
where e.archived_at is null;

-- This is deliberately a curated future client contract. It remains protected by
-- the same internal member RLS today; engagement_access_grants does not activate
-- external access by itself.
create or replace view public.engagement_client_surface_v with (security_invoker=true) as
select e.id,e.engagement_number,e.name,e.engagement_type,e.customer_request,e.desired_outcome,
  e.event_start,e.event_end,e.event_start_date,e.event_end_date,e.venue_name,e.venue_address,
  e.commercial_state,e.commitment_state,e.operational_state,
  coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from (
    select ep.id,ep.role,ep.is_primary,ep.created_at,p.id as party_id,p.party_type,p.name,p.organization_name,p.email,p.phone
    from public.engagement_parties ep join public.parties p on p.id=ep.party_id
    where ep.engagement_id=e.id and ep.role in ('CUSTOMER','PRIMARY_CONTACT','BUYER','PAYER','DECISION_MAKER','PLANNER','END_USER')
  ) x),'[]'::jsonb) as people,
  coalesce((select jsonb_agg(to_jsonb(d)-'metadata'-'notes'-'source_artifact_id'-'source_segment_id'-'created_by' order by d.created_at) from public.commercial_documents d where d.engagement_id=e.id and d.client_visible=true and d.document_state<>'VOID'),'[]'::jsonb) as commercial_documents,
  coalesce((select jsonb_agg(jsonb_build_object('id',si.id,'schedule_type',si.schedule_type,'label',si.label,'start_at',si.start_at,'end_at',si.end_at,'start_date',si.start_date,'end_date',si.end_date,'time_state',si.time_state,'location_name',coalesce(l.name,si.location_name),'location_address',coalesce(l.address,si.location_address)) order by coalesce(si.start_at,si.start_date::timestamptz,'infinity'::timestamptz)) from public.engagement_schedule_items si left join public.locations l on l.id=si.location_id where si.engagement_id=e.id),'[]'::jsonb) as schedule,
  coalesce((select jsonb_agg(to_jsonb(o)-'metadata'-'payload'-'created_by'-'approved_by' order by o.output_type,o.version_no,o.created_at) from public.engagement_outputs o where o.engagement_id=e.id and o.client_visible=true and o.output_state not in ('SUPERSEDED','VOID')),'[]'::jsonb) as shared_outputs,
  coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'title',w.title,'status',w.status,'due_at',w.due_at,'due_date',w.due_date,'waiting_on',w.waiting_on,'success_condition',w.success_condition) order by w.created_at) from public.work_items w where w.engagement_id=e.id and w.visibility in ('SHARED','CLIENT') and w.status in ('OPEN','WAITING','BLOCKED')),'[]'::jsonb) as shared_actions
from public.engagements e where e.archived_at is null;

-- Keep original column order stable; append the new fields at the end.
create or replace view public.daily_work_queue_v with (security_invoker=true) as
select w.id,w.engagement_id,e.engagement_number,e.name as engagement_name,e.event_start_date,
  w.title,w.action_type,w.status,w.priority,w.due_at,w.due_date,w.trigger_text,w.waiting_on,w.why_now,w.instructions,w.context_summary,w.success_condition,w.next_step_hint,
  tm.id as owner_member_id,tm.username as owner_username,tm.display_name as owner_display_name,tm.user_id as owner_user_id,
  w.visibility,w.origin,rp.id as responsible_party_id,rp.name as responsible_party_name,rp.organization_name as responsible_party_organization
from public.work_items w
left join public.engagements e on e.id=w.engagement_id
left join public.team_members tm on tm.id=w.owner_member_id
left join public.parties rp on rp.id=w.responsible_party_id
where w.status in ('OPEN','WAITING','BLOCKED');

-- Explicit read grants; no view is anonymous.
do $$ declare r text; begin
  foreach r in array array[
    'engagement_economics_v','resource_commitment_current_v','location_memory_v','relationship_summary_v','contributor_work_v',
    'engagement_frontend_v','engagement_workspace_v','engagement_client_surface_v','daily_work_queue_v',
    'capacity_pressure_signals','fulfillment_plan_current_v','learning_review_signals','pricing_observations_v'
  ] loop
    execute format('revoke all on table public.%I from anon',r);
    execute format('revoke all on table public.%I from authenticated',r);
    execute format('grant select on table public.%I to authenticated',r);
  end loop;
end $$;

commit;

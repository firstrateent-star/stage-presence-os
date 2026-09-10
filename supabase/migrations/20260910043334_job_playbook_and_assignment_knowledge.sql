-- Stage Presence OS — reusable operating knowledge + granular assignment responsibility
--
-- Process knowledge is distinct from job-state truth:
--   playbook step = what can/should happen
--   engagement step state = what actually applies/happened on one Engagement
--   engagement assignment = a contributor's role on the Engagement
--   engagement step assignment = their concrete responsibility for a lifecycle step

begin;

alter table public.engagement_assignments add column if not exists scope_summary text;
alter table public.engagement_assignments add column if not exists briefing_notes text;
alter table public.engagement_assignments add column if not exists acceptance_criteria text;
alter table public.engagement_assignments add column if not exists acknowledgement_state text not null default 'UNSENT';
alter table public.engagement_assignments add column if not exists acknowledged_at timestamptz;
alter table public.engagement_assignments add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.engagement_assignments add column if not exists schedule_item_id uuid references public.engagement_schedule_items(id) on delete set null;
alter table public.engagement_assignments drop constraint if exists engagement_assignments_acknowledgement_state_check;
alter table public.engagement_assignments add constraint engagement_assignments_acknowledgement_state_check check (acknowledgement_state = any (array['UNSENT','SENT','ACKNOWLEDGED','DECLINED','NOT_REQUIRED']::text[]));

create table if not exists public.operating_playbooks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'DRAFT' check (status = any (array['DRAFT','ACTIVE','SUPERSEDED','RETIRED']::text[])),
  purpose text,
  description text,
  source_kind text not null default 'SYSTEM_MODEL' check (source_kind = any (array['SYSTEM_MODEL','HUMAN','OPERATING_EVIDENCE','IMPORT','OTHER']::text[])),
  governance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(code, version)
);

create table if not exists public.operating_playbook_steps (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.operating_playbooks(id) on delete cascade,
  step_code text not null,
  phase_order integer not null check (phase_order >= 0),
  phase_code text not null,
  phase_name text not null,
  sort_order integer not null check (sort_order >= 0),
  title text not null,
  purpose text,
  requiredness text not null default 'CONDITIONAL' check (requiredness = any (array['CORE','CONDITIONAL','OPTIONAL']::text[])),
  automation_mode text not null default 'ASSISTED' check (automation_mode = any (array['SYSTEM','ASSISTED','HUMAN']::text[])),
  default_role_code text,
  default_capability_code text,
  applies_to_engagement_types text[] not null default '{}'::text[],
  condition_text text,
  client_touchpoint boolean not null default false,
  procedure_depth text not null default 'MAP_ONLY' check (procedure_depth = any (array['MAP_ONLY','CHECKLIST','SOP','VERIFIED_SOP']::text[])),
  instruction_summary text,
  completion_definition text,
  evidence_expectation text,
  risk_if_missed text,
  dependency_step_codes text[] not null default '{}'::text[],
  inputs jsonb not null default '[]'::jsonb,
  outputs jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(playbook_id, step_code)
);

create table if not exists public.engagement_step_states (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  playbook_step_id uuid not null references public.operating_playbook_steps(id) on delete cascade,
  status text not null default 'NOT_STARTED' check (status = any (array['NOT_STARTED','READY','ACTIVE','WAITING','BLOCKED','DONE','SKIPPED','NOT_APPLICABLE']::text[])),
  requirement_state text not null default 'UNKNOWN' check (requirement_state = any (array['REQUIRED','CONDITIONAL','OPTIONAL','NOT_APPLICABLE','UNKNOWN']::text[])),
  owner_member_id uuid references public.team_members(id) on delete set null,
  responsible_party_id uuid references public.parties(id) on delete set null,
  due_at timestamptz,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  evidence_summary text,
  certainty_state text not null default 'KNOWN' check (certainty_state = any (array['VERIFIED','KNOWN','ESTIMATED','ASSUMED','CONFLICTING']::text[])),
  source_artifact_id uuid references public.source_artifacts(id) on delete set null,
  source_segment_id uuid references public.source_artifact_segments(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(engagement_id, playbook_step_id)
);

create table if not exists public.engagement_step_assignments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  playbook_step_id uuid not null references public.operating_playbook_steps(id) on delete cascade,
  engagement_assignment_id uuid not null references public.engagement_assignments(id) on delete cascade,
  responsibility_type text not null default 'LEAD' check (responsibility_type = any (array['LEAD','SUPPORT','APPROVER','CONSULTED','INFORMED']::text[])),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(playbook_step_id, engagement_assignment_id, responsibility_type)
);

alter table public.work_items add column if not exists playbook_step_id uuid references public.operating_playbook_steps(id) on delete set null;
alter table public.work_items add column if not exists engagement_step_state_id uuid references public.engagement_step_states(id) on delete set null;
alter table public.engagement_outputs add column if not exists playbook_step_id uuid references public.operating_playbook_steps(id) on delete set null;
alter table public.engagement_schedule_items add column if not exists playbook_step_id uuid references public.operating_playbook_steps(id) on delete set null;

create index if not exists operating_playbook_steps_playbook_phase_idx on public.operating_playbook_steps(playbook_id, phase_order, sort_order);
create index if not exists engagement_step_states_engagement_idx on public.engagement_step_states(engagement_id);
create index if not exists engagement_step_states_owner_idx on public.engagement_step_states(owner_member_id);
create index if not exists engagement_step_assignments_engagement_idx on public.engagement_step_assignments(engagement_id);
create index if not exists engagement_step_assignments_assignment_idx on public.engagement_step_assignments(engagement_assignment_id);
create index if not exists engagement_assignments_location_idx on public.engagement_assignments(location_id);
create index if not exists engagement_assignments_schedule_idx on public.engagement_assignments(schedule_item_id);
create index if not exists work_items_playbook_step_idx on public.work_items(playbook_step_id);
create index if not exists work_items_step_state_idx on public.work_items(engagement_step_state_id);
create index if not exists engagement_outputs_playbook_step_idx on public.engagement_outputs(playbook_step_id);
create index if not exists engagement_schedule_items_playbook_step_idx on public.engagement_schedule_items(playbook_step_id);

insert into public.operating_playbooks(code,name,version,status,purpose,description,source_kind,governance_notes)
values (
  'STAGE_PRESENCE_CORE_LIFECYCLE',
  'Stage Presence Engagement Lifecycle',
  1,
  'ACTIVE',
  'Preserve a reusable start-to-finish map of how Stage Presence can turn customer intent into a reliable delivered experience, economic outcome, learning and recurrence.',
  'This is a process knowledge map, not evidence that every step applies or has been completed on any specific Engagement. Steps may be core, conditional or optional and may vary by engagement species.',
  'SYSTEM_MODEL',
  'Built from the current business model and operating reality. Technical/safety procedures remain MAP_ONLY until verified SOP detail is captured from qualified operating evidence.'
)
on conflict(code,version) do update set status='ACTIVE', purpose=excluded.purpose, description=excluded.description, governance_notes=excluded.governance_notes, updated_at=now();

with pb as (select id from public.operating_playbooks where code='STAGE_PRESENCE_CORE_LIFECYCLE' and version=1),
seed(phase_order,phase_code,phase_name,sort_order,step_code,title,requiredness,automation_mode,default_role_code,types,client_touchpoint,procedure_depth,condition_text,completion_definition,risk_if_missed) as (values
(10,'INTENT','Intent & Intake',10,'PRESERVE_SOURCE','Preserve original inquiry or source','CORE','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Whenever new demand or material job information arrives.','Original source is retained and linked to the Engagement.','Context must be reconstructed from memory later.'),
(10,'INTENT','Intent & Intake',20,'IDENTIFY_PARTIES','Identify customer, contacts and decision roles','CORE','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Represent buyer, payer, planner, venue contact, referrer and end user only when supported.','Known participant roles are linked and unknown roles remain unknown.','The wrong person is contacted or authority is assumed.'),
(10,'INTENT','Intent & Intake',30,'CAPTURE_OUTCOME','Capture desired customer and audience outcome','CORE','HUMAN','COMMERCIAL','{}'::text[],true,'CHECKLIST','Clarify what success means beyond equipment requested.','Desired outcome is represented separately from customer request.','Stage Presence sells equipment instead of solving the real problem.'),
(10,'INTENT','Intent & Intake',40,'CAPTURE_DATE_LOCATION','Capture date, location and timing truth','CORE','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Use date-only truth when exact times are not known.','Known date/location facts are represented with uncertainty preserved.','Scheduling or capacity decisions rely on invented timing.'),
(10,'INTENT','Intent & Intake',50,'CLASSIFY_ENGAGEMENT','Classify the Engagement species','CORE','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','EVENT, LONG_TERM_RENTAL, INSTALLATION, EQUIPMENT_SALE, SERVICE or OTHER.','Engagement type reflects the best-supported business species.','Wrong process or economic assumptions are applied.'),
(10,'INTENT','Intent & Intake',60,'CAPTURE_CONSTRAINTS','Capture budget, deadline and known constraints','CONDITIONAL','HUMAN','COMMERCIAL','{}'::text[],true,'CHECKLIST','Capture only what is actually known or requested.','Material budget/timeline/constraint facts are represented.','A late constraint invalidates solution or price.'),

(20,'REQUIREMENTS','Requirements',10,'TRANSLATE_REQUIREMENTS','Translate intent into production requirements','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Separate customer request from technical requirement.','Requirements are explicit enough to design without pretending guesses are facts.','A request is committed before it is technically understood.'),
(20,'REQUIREMENTS','Requirements',20,'IDENTIFY_UNKNOWNS','Identify decision-changing unknowns','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Prioritize unknowns that can change scope, feasibility, price, timing or risk.','Material unknowns are visible, routed or intentionally deferred.','Unknowns surface during execution.'),
(20,'REQUIREMENTS','Requirements',30,'CHECK_LOCATION_MEMORY','Check venue / site history','CONDITIONAL','SYSTEM','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Use when a venue/site is known.','Relevant location knowledge is surfaced without overriding current evidence.','Known site lessons are repeatedly rediscovered.'),
(20,'REQUIREMENTS','Requirements',40,'SITE_DISCOVERY','Perform site / technical discovery when needed','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE'],true,'MAP_ONLY','Use when site conditions can change design, safety, labor or feasibility.','Required site information is captured or a site visit is completed.','Solution fails because site assumptions were never verified.'),
(20,'REQUIREMENTS','Requirements',50,'SAFETY_ACCESS_REQUIREMENTS','Capture safety, access, permit and venue constraints','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL','SERVICE'],true,'MAP_ONLY','Use when rigging, power, traffic, public access, lifts or site rules may matter.','Material constraints are known or explicitly unresolved.','Unsafe, late or noncompliant execution.'),
(20,'REQUIREMENTS','Requirements',60,'CONTENT_SIGNAL_REQUIREMENTS','Define content, signal, camera, playback and connectivity needs','CONDITIONAL','ASSISTED','CONTENT',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],true,'CHECKLIST','Use when visual playback, camera, streaming, network or content is in scope.','Inputs, destinations, formats and deadlines are understood at the needed depth.','Correct hardware arrives but the experience fails.'),
(20,'REQUIREMENTS','Requirements',70,'SERVICE_DIAGNOSE','Diagnose service issue / requested support','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['SERVICE'],true,'MAP_ONLY','Preserve reported symptom separately from diagnosed cause.','Diagnosis, test path or unresolved diagnostic question is represented.','Service action mistakes symptom for cause.'),

(30,'SOLUTION','Solution Design',10,'DESIGN_PRIMARY_SOLUTION','Design the primary outcome solution','CORE','HUMAN','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Choose the minimum coherent solution that can reliably create the outcome.','A technically coherent primary solution is represented.','Commercial scope is assembled without a deliverable system.'),
(30,'SOLUTION','Solution Design',20,'ADD_ADJACENCIES','Add only value-supporting adjacent capabilities','CONDITIONAL','HUMAN','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Audio, lighting, staging, rigging, content, camera, network and labor should support outcome/reliability.','Adjacencies are justified by outcome, reliability or economics.','Complexity grows without enough value.'),
(30,'SOLUTION','Solution Design',30,'DEFINE_SOURCING','Define owned / partner / subcontract / venue sourcing expectations','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Configuration is not availability or ownership.','Planned sourcing is known at useful scope with exceptions visible.','Quote assumes capability that cannot be supplied.'),
(30,'SOLUTION','Solution Design',40,'DEFINE_CREW_SHAPE','Define required human capabilities and crew shape','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],false,'CHECKLIST','Describe capabilities/roles before assigning people.','Needed roles/capabilities and approximate windows are represented.','People are assigned by habit rather than need.'),
(30,'SOLUTION','Solution Design',50,'DEFINE_LOGISTICS','Define delivery, transport, travel, load-in and return shape','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','LONG_TERM_RENTAL','INSTALLATION','EQUIPMENT_SALE'],false,'CHECKLIST','Model logistics when they materially affect cost, timing or feasibility.','Logistics scope is coherent enough for pricing and planning.','Transport/labor is discovered after commitment.'),
(30,'SOLUTION','Solution Design',60,'DRAFT_FULFILLMENT_SCOPE','Draft fulfillment scope','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Commercial promise and fulfillment plan stay distinct but aligned.','Draft fulfillment lines describe what delivery would require.','Operations must reconstruct the sale.'),

(40,'FEASIBILITY','Feasibility & Risk',10,'CHECK_CAPACITY_PRESSURE','Check resource-window pressure','CORE','SYSTEM','PROJECT_MANAGER',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],false,'CHECKLIST','Pressure is a signal, not a reservation.','Overlapping demand on scarce resources is surfaced.','Sales consumes unavailable capacity.'),
(40,'FEASIBILITY','Feasibility & Risk',20,'VERIFY_CRITICAL_CAPACITY','Verify critical availability / quantity when decision leverage warrants','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],false,'CHECKLIST','Verify scarce or decision-changing resources first.','Critical capacity is sufficiently verified for the current decision.','A soft assumption becomes a hard promise.'),
(40,'FEASIBILITY','Feasibility & Risk',30,'VERIFY_VENDOR_FEASIBILITY','Verify partner, subcontract or rental feasibility','CONDITIONAL','HUMAN','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Use when sourcing is external or uncertain.','External capability can be obtained or its risk remains visible.','Third-party dependency fails after sale.'),
(40,'FEASIBILITY','Feasibility & Risk',40,'VERIFY_CREW_FEASIBILITY','Verify required crew capability and availability','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE'],false,'CHECKLIST','Focus on specialized/critical roles.','Required capability can be staffed or an exception is visible.','Equipment is ready but qualified labor is not.'),
(40,'FEASIBILITY','Feasibility & Risk',50,'VERIFY_SITE_FEASIBILITY','Verify venue / site feasibility','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE'],false,'MAP_ONLY','Use when access, structure, power, network or dimensions can invalidate solution.','Material site assumptions are checked to the required degree.','An impossible or unsafe promise is sold.'),
(40,'FEASIBILITY','Feasibility & Risk',60,'REVIEW_WORKING_CAPITAL','Review procurement and working-capital exposure','CONDITIONAL','ASSISTED','COMMERCIAL',array['INSTALLATION','EQUIPMENT_SALE','LONG_TERM_RENTAL'],false,'CHECKLIST','Use when Stage Presence must buy, finance, prepay or carry material cost.','Cash exposure and billing/deposit structure are understood.','A profitable project creates a cash crisis.'),
(40,'FEASIBILITY','Feasibility & Risk',70,'SALE_SOURCE_OWNERSHIP','Verify sale-item source, ownership and transferability','CONDITIONAL','HUMAN','COMMERCIAL',array['EQUIPMENT_SALE'],false,'CHECKLIST','Important for used equipment, sourced products and packages.','Items Stage Presence can transfer are verified.','Stage Presence sells what it cannot transfer as represented.'),
(40,'FEASIBILITY','Feasibility & Risk',80,'SERVICE_APPROVAL_BOUNDARY','Define service authorization / not-to-exceed boundary','CONDITIONAL','HUMAN','COMMERCIAL',array['SERVICE'],true,'CHECKLIST','Use when diagnosis and repair scope may evolve.','Customer authorization boundary is explicit before material work/cost.','Unapproved work creates billing disputes.'),
(40,'FEASIBILITY','Feasibility & Risk',90,'REVIEW_EXCEPTION_RISK','Review material technical, commercial and delivery exceptions','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Routine work should pass quickly; unusual risk should surface.','Material exceptions have an owner/decision or are explicitly accepted.','Founder attention is wasted on routine work while real risk is missed.'),

(50,'COMMERCIAL','Commercial',10,'ESTIMATE_DIRECT_COSTS','Estimate directly caused Engagement costs','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Estimate where cost evidence informs price, deposit or feasibility.','Known/estimated direct costs are represented with source/certainty.','Revenue is mistaken for contribution.'),
(50,'COMMERCIAL','Commercial',20,'REVIEW_PRICE_HISTORY','Review relevant historical pricing evidence','CONDITIONAL','SYSTEM','COMMERCIAL','{}'::text[],false,'CHECKLIST','History informs; historical price is never automatically current approved price.','Relevant observations are visible to the pricing decision.','Old prices silently become policy.'),
(50,'COMMERCIAL','Commercial',30,'SET_PRICE_POSITION','Determine commercial price position','CORE','HUMAN','COMMERCIAL','{}'::text[],false,'MAP_ONLY','Consider cost, capacity, complexity, risk, relationship and target contribution.','Intended price and exception basis are explicit.','Price is arbitrary or disconnected from economics.'),
(50,'COMMERCIAL','Commercial',40,'BUILD_COMMERCIAL_SCOPE','Build commercial document scope / lines','CORE','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Translate solution into customer-facing scope and line economics.','Commercial lines support the promise without becoming the fulfillment plan.','Quote is incomplete or operationally ambiguous.'),
(50,'COMMERCIAL','Commercial',50,'COMMERCIAL_EXCEPTION_APPROVAL','Resolve pricing / terms exceptions','CONDITIONAL','HUMAN','COMMERCIAL','{}'::text[],false,'MAP_ONLY','Use only outside approved routine boundaries.','Exception is approved, revised or declined.','Routine work bottlenecks or risky terms slip through.'),
(50,'COMMERCIAL','Commercial',60,'GENERATE_QUOTE','Generate quote / proposal','CORE','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Generate from represented scope and approved decision state.','A versioned commercial output exists.','Manual re-entry creates scope/price error.'),
(50,'COMMERCIAL','Commercial',70,'SEND_QUOTE','Send quote / proposal and record delivery','CORE','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Record the version actually sent and when.','Client has the intended version and sent-state is preserved.','Team follows up on the wrong or unsent version.'),
(50,'COMMERCIAL','Commercial',80,'FOLLOW_UP_DECISION','Follow up and obtain commercial decision','CORE','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Advance legitimate demand without generic CRM busywork.','Decision, revision, next decision date or loss is known.','Demand stalls through inattention.'),
(50,'COMMERCIAL','Commercial',90,'REVISE_SCOPE_PRICE','Revise scope / price while preserving versions','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Use when requirements, price or terms change.','New version supersedes prior version without deleting history.','Accepted scope becomes ambiguous.'),

(60,'COMMITMENT','Commitment & Handoff',10,'CAPTURE_ACCEPTANCE','Capture signed acceptance / commitment evidence','CORE','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Signed is not deposit received or capacity reserved.','Commitment state is backed by evidence and linked version.','Operations acts on uncommitted work.'),
(60,'COMMITMENT','Commitment & Handoff',20,'ESTABLISH_PAYMENT_SCHEDULE','Establish deposit / progress / final payment schedule','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Payment timing should reflect risk and working-capital exposure.','Payment obligations/triggers are represented.','Collection depends on memory and cash risk is hidden.'),
(60,'COMMITMENT','Commitment & Handoff',30,'VERIFY_PAYMENT_STATE','Verify deposit / current payment state','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Source snapshots do not equal current bank/accounting truth.','Current payment evidence is recorded or unresolved status is explicit.','Operations relies on stale payment data.'),
(60,'COMMITMENT','Commitment & Handoff',40,'HANDOFF_ACCEPTED_SCOPE','Convert accepted commercial scope into operational scope without re-entry','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Preserve links between commercial and fulfillment reality.','Operations can see what was promised and what still needs interpretation.','Team reconstructs the sale manually.'),
(60,'COMMITMENT','Commitment & Handoff',50,'CREATE_RESOURCE_COMMITMENTS','Create holds / reservations / allocations only when earned','CONDITIONAL','ASSISTED','PROJECT_MANAGER',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],false,'CHECKLIST','Do not infer reservation from signature or configuration alone.','Each real commitment has type/state/window/source/certainty.','Capacity is double-booked or falsely blocked.'),
(60,'COMMITMENT','Commitment & Handoff',60,'OPEN_CLIENT_DEPENDENCIES','Open client approvals, content, access or decision dependencies','CONDITIONAL','ASSISTED','PROJECT_MANAGER','{}'::text[],true,'CHECKLIST','Only true client-owned dependencies become shared/client actions.','Client-owned next moves are explicit with success condition.','Delay comes from an unstated dependency.'),

(65,'INSTALL_PREP','Installation-Specific Preparation',10,'INSTALL_SITE_SURVEY','Complete installation site survey / field verification','CONDITIONAL','HUMAN','INSTALLER',array['INSTALLATION'],true,'MAP_ONLY','Use when dimensions, structure, utilities or pathways matter.','Installation assumptions are field-verified to required depth.','Procurement/design is based on wrong site conditions.'),
(65,'INSTALL_PREP','Installation-Specific Preparation',20,'INSTALL_ENGINEERING_SUBMITTALS','Prepare / secure drawings, engineering, submittals or approvals','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['INSTALLATION'],true,'MAP_ONLY','Use only where project/site/authority requires it.','Required approval artifacts are accepted or exception is owned.','Install is delayed or noncompliant.'),
(65,'INSTALL_PREP','Installation-Specific Preparation',30,'INSTALL_PROCUREMENT','Procure installation equipment and materials','CONDITIONAL','ASSISTED','PROJECT_MANAGER',array['INSTALLATION'],false,'CHECKLIST','Track lead times, purchase commitments and working capital.','Required materials are ordered/received against approved scope.','Install date arrives before materials.'),
(65,'INSTALL_PREP','Installation-Specific Preparation',40,'INSTALL_SITE_READINESS','Verify customer / GC site readiness','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['INSTALLATION'],true,'CHECKLIST','Check applicable power, structure, access, network and construction dependencies.','Blocking site dependencies are complete or explicitly owned.','Crew mobilizes to a site that cannot accept installation.'),

(70,'PREPRODUCTION','Preproduction & Preparation',10,'BUILD_EXECUTION_SCHEDULE','Build execution schedule','CORE','ASSISTED','PROJECT_MANAGER',array['EVENT','LONG_TERM_RENTAL','INSTALLATION','SERVICE','EQUIPMENT_SALE'],false,'CHECKLIST','Represent known times and keep TBD as TBD.','Relevant prep, travel, delivery, show/service and return windows are represented.','People/equipment cannot coordinate around one timeline.'),
(70,'PREPRODUCTION','Preproduction & Preparation',20,'CONFIRM_VENUE_ACCESS','Confirm venue / site contact, access and load-in details','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],true,'CHECKLIST','Confirm call-ahead, gates, docks, parking, elevators, credentials and restrictions where relevant.','Execution team has usable arrival/access instructions.','Crew arrives without access or adds avoidable labor.'),
(70,'PREPRODUCTION','Preproduction & Preparation',30,'CONFIRM_INFRASTRUCTURE','Confirm power, network, rigging and site infrastructure','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL'],false,'MAP_ONLY','Use when infrastructure affects reliability or safety.','Dependencies are confirmed or contingencies are explicit.','System cannot be powered, connected or supported.'),
(70,'PREPRODUCTION','Preproduction & Preparation',40,'LOCK_CONTENT_INPUTS','Lock content / playback / input delivery','CONDITIONAL','ASSISTED','CONTENT',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],true,'CHECKLIST','Set owner, specs, deadline, test path and fallback.','Required content/input is received/tested or fallback is owned.','Hardware is ready but content is not.'),
(70,'PREPRODUCTION','Preproduction & Preparation',50,'ASSIGN_JOB_ROLES','Assign contributor roles to the Engagement','CORE','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],false,'CHECKLIST','Assign people only after job need/role is understood.','Each required role has a confirmed or unresolved contributor.','Responsibility is assumed rather than assigned.'),
(70,'PREPRODUCTION','Preproduction & Preparation',60,'DECOMPOSE_RESPONSIBILITY','Map assignments to concrete process-step responsibilities','CORE','ASSISTED','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],false,'CHECKLIST','Use lead/support/approver/consulted/informed at step level where useful.','Critical steps have explicit responsibility without duplicating the whole workflow as tasks.','Everyone is assigned to the job but no one owns the work.'),
(70,'PREPRODUCTION','Preproduction & Preparation',70,'ACKNOWLEDGE_ASSIGNMENTS','Confirm contributor acknowledgment and availability','CONDITIONAL','ASSISTED','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],false,'CHECKLIST','Use for critical field assignments.','Critical contributors acknowledge scope/timing or replacement action is open.','A name in the system is mistaken for a confirmed human.'),
(70,'PREPRODUCTION','Preproduction & Preparation',80,'SOURCE_EXTERNAL_CAPABILITY','Secure external rentals, vendors, purchases or partners','CONDITIONAL','HUMAN','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Convert planned sourcing into actual commitment only when booked/ordered.','Required external capability is committed.','Sourcing intention is mistaken for secured capacity.'),
(70,'PREPRODUCTION','Preproduction & Preparation',90,'CREATE_JOB_BRIEF','Generate job brief / assignment information','CORE','ASSISTED','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],false,'CHECKLIST','Generate from schedule, fulfillment, assignments, contacts and venue knowledge.','Contributors understand where, when, why, what they own and success criteria.','Critical knowledge remains in texts or one person’s head.'),
(70,'PREPRODUCTION','Preproduction & Preparation',100,'CREATE_PULL_PACK','Create pull / pack / prep list','CONDITIONAL','ASSISTED','WAREHOUSE',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],false,'CHECKLIST','Derive from canonical fulfillment plan.','Required physical items and quantities are represented for prep.','Wrong/missing gear reaches site.'),
(70,'PREPRODUCTION','Preproduction & Preparation',110,'TEST_CONFIGURE','Test, configure and stage critical systems','CONDITIONAL','HUMAN','WAREHOUSE',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],false,'MAP_ONLY','Detailed technical SOPs must be captured separately from qualified evidence.','Critical systems are tested/configured to required confidence.','Failure is discovered on site.'),
(70,'PREPRODUCTION','Preproduction & Preparation',120,'LOAD_TRANSPORT','Load vehicles / trailers and confirm transport readiness','CONDITIONAL','HUMAN','WAREHOUSE',array['EVENT','LONG_TERM_RENTAL','INSTALLATION','EQUIPMENT_SALE'],false,'CHECKLIST','Confirm load order, securement and required transport resources as appropriate.','Required prepared equipment is loaded and transport is ready.','Prepared equipment is left behind or transport fails.'),
(70,'PREPRODUCTION','Preproduction & Preparation',130,'LONG_TERM_BILLING_CADENCE','Set recurring billing cadence for long-term deployment','CONDITIONAL','ASSISTED','COMMERCIAL',array['LONG_TERM_RENTAL'],true,'CHECKLIST','Use when deployment spans billing cycles.','Recurring payment schedule is represented.','Long utilization consumes capacity without reliable cash cadence.'),
(70,'PREPRODUCTION','Preproduction & Preparation',140,'SALE_SERIAL_WARRANTY','Capture relevant serial, condition and warranty information','CONDITIONAL','ASSISTED','COMMERCIAL',array['EQUIPMENT_SALE'],true,'CHECKLIST','Use only where relevant to sold assets.','Material identity/condition/warranty terms are recorded.','Post-sale disputes lack item truth.'),
(70,'PREPRODUCTION','Preproduction & Preparation',150,'FINAL_READINESS_REVIEW','Run final execute-readiness review','CORE','ASSISTED','PROJECT_MANAGER',array['EVENT','LONG_TERM_RENTAL','INSTALLATION','SERVICE','EQUIPMENT_SALE'],false,'CHECKLIST','Check decision-changing exceptions across people, equipment, timing, venue, client inputs and money.','No hidden blocker remains; open exceptions have owners.','The system appears green while a material dependency is unresolved.'),

(80,'DELIVERY','Delivery & Experience',10,'TRAVEL_ARRIVAL','Travel, arrive and check in','CONDITIONAL','HUMAN','DRIVER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL','EQUIPMENT_SALE'],false,'CHECKLIST','Use where Stage Presence performs delivery or onsite work.','Assigned team/capability arrives at correct place/time.','Late or misdirected arrival compresses setup.'),
(80,'DELIVERY','Delivery & Experience',20,'LOAD_IN','Load in / move equipment to work area','CONDITIONAL','HUMAN','LABOR',array['EVENT','INSTALLATION','LONG_TERM_RENTAL'],false,'MAP_ONLY','Detailed handling/safety depends on site and equipment.','Required equipment reaches work area safely.','Damage, delay or unsafe handling.'),
(80,'DELIVERY','Delivery & Experience',30,'BUILD_SYSTEM','Build / install / position the system','CONDITIONAL','HUMAN','INSTALLER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL'],false,'MAP_ONLY','Technical SOP depth varies by system.','Physical system is assembled/positioned to design requirements.','Build differs from design or safety intent.'),
(80,'DELIVERY','Delivery & Experience',40,'CONNECT_COMMISSION','Power, network, signal and commission the system','CONDITIONAL','HUMAN','VIDEO_TECH',array['EVENT','INSTALLATION','LONG_TERM_RENTAL','SERVICE'],false,'MAP_ONLY','Follow equipment/site-specific procedures.','System functions end-to-end at required reliability.','Components work individually but the delivered system does not.'),
(80,'DELIVERY','Delivery & Experience',50,'SAFETY_RELIABILITY_CHECK','Perform pre-use safety and reliability check','CORE','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL','SERVICE'],false,'MAP_ONLY','Detailed safety procedure requires verified equipment/site-specific SOPs.','Critical checks are complete or exception is escalated.','Human safety or reliability is compromised.'),
(80,'DELIVERY','Delivery & Experience',60,'VERIFY_CONTENT_PLAYBACK','Verify content / playback / camera / signal behavior','CONDITIONAL','HUMAN','CONTENT',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],true,'CHECKLIST','Validate actual experience path, not merely device power.','Intended input reaches intended output correctly.','System is powered but the experience is wrong.'),
(80,'DELIVERY','Delivery & Experience',70,'CLIENT_WALKTHROUGH','Confirm client / stakeholder readiness or acceptance','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL','SERVICE','EQUIPMENT_SALE'],true,'CHECKLIST','Use where acceptance/handoff matters.','Stakeholder understands/accepts delivered state or issues are recorded.','Expectations surface after departure.'),
(80,'DELIVERY','Delivery & Experience',80,'OPERATE_SUPPORT','Operate / support the live experience','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT'],true,'MAP_ONLY','Role depends on show scope: video, audio, camera, content, PM or support.','Production is supported through agreed window.','Live experience fails despite successful setup.'),
(80,'DELIVERY','Delivery & Experience',90,'LONG_TERM_INSPECTION_CADENCE','Define periodic inspection / service cadence','CONDITIONAL','ASSISTED','PROJECT_MANAGER',array['LONG_TERM_RENTAL'],true,'MAP_ONLY','Depth depends on asset, environment and risk.','Inspection/service expectation and owner are explicit.','Deployed asset degrades invisibly.'),
(80,'DELIVERY','Delivery & Experience',100,'INSTALL_EXECUTION','Execute permanent / semi-permanent installation','CONDITIONAL','HUMAN','INSTALLER',array['INSTALLATION'],false,'MAP_ONLY','Detailed SOP depends on system, structural, electrical and manufacturer requirements.','Installed system matches approved scope and field changes are recorded.','Permanent defects or unsafe work are embedded.'),
(80,'DELIVERY','Delivery & Experience',110,'INSTALL_COMMISSIONING','Commission and acceptance-test installed system','CONDITIONAL','HUMAN','INSTALLER',array['INSTALLATION'],true,'MAP_ONLY','Use test criteria appropriate to installed system.','System passes required functional/reliability acceptance criteria.','Install is complete without verified operation.'),
(80,'DELIVERY','Delivery & Experience',120,'INSTALL_TRAINING_HANDOFF','Train customer and hand off installed system','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['INSTALLATION'],true,'CHECKLIST','Cover agreed operation, limitations, escalation and documentation.','Customer can operate agreed functions and handoff is acknowledged.','Support burden grows because ownership was never transferred.'),
(80,'DELIVERY','Delivery & Experience',130,'SALE_DELIVERY_ACCEPTANCE','Deliver / transfer sale items and capture acceptance','CONDITIONAL','HUMAN','COMMERCIAL',array['EQUIPMENT_SALE'],true,'CHECKLIST','Use actual pickup, delivery or transfer method.','Transfer is completed and exceptions/acceptance are represented.','Ownership/receipt is ambiguous.'),
(80,'DELIVERY','Delivery & Experience',140,'SERVICE_EXECUTION','Perform approved service / support work','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['SERVICE'],false,'MAP_ONLY','Detailed SOP depends on equipment/system and qualified capability.','Approved service action is completed and deviations are recorded.','Service work is untraceable.'),
(80,'DELIVERY','Delivery & Experience',150,'SERVICE_TEST_REPORT','Test result and issue service report / handoff','CONDITIONAL','ASSISTED','PROJECT_MANAGER',array['SERVICE'],true,'CHECKLIST','Report what was found, changed, remains and next action.','Customer receives usable result and system knowledge is updated.','Repeated service starts diagnosis from zero.'),
(80,'DELIVERY','Delivery & Experience',160,'RECORD_FIELD_CHANGES','Record field changes, incidents and material deviations','CORE','ASSISTED','PROJECT_MANAGER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL','SERVICE'],false,'CHECKLIST','Capture deviations affecting scope, cost, reliability, learning or future work.','Material changes/incidents are attached while context is fresh.','Learning and commercial changes disappear after the job.'),

(90,'RETURN','Strike, Return & Reconciliation',10,'STRIKE_SYSTEM','Strike / de-install temporary system','CONDITIONAL','HUMAN','LABOR',array['EVENT','LONG_TERM_RENTAL'],false,'MAP_ONLY','Follow system/site-specific safety procedures.','Temporary system is safely broken down for return.','Damage, loss or unsafe strike.'),
(90,'RETURN','Strike, Return & Reconciliation',20,'LOAD_OUT','Load out and clear site','CONDITIONAL','HUMAN','LABOR',array['EVENT','LONG_TERM_RENTAL','SERVICE'],false,'CHECKLIST','Confirm site handback requirements where applicable.','Scope is removed/cleared and site obligations met.','Gear or obligations are left behind.'),
(90,'RETURN','Strike, Return & Reconciliation',30,'RETURN_EXTERNAL_GEAR','Return subcontract / partner / rental gear','CONDITIONAL','ASSISTED','WAREHOUSE','{}'::text[],false,'CHECKLIST','Track deadlines, quantity and condition for third-party equipment.','External gear is returned or exception is owned.','Late fees, replacement cost or relationship damage.'),
(90,'RETURN','Strike, Return & Reconciliation',40,'RECONCILE_EQUIPMENT','Reconcile quantity and condition after use','CONDITIONAL','HUMAN','WAREHOUSE',array['EVENT','LONG_TERM_RENTAL','INSTALLATION','SERVICE'],false,'CHECKLIST','Compare planned/committed with returned or deployed reality.','Missing/damaged/changed assets are identified.','Inventory truth silently degrades.'),
(90,'RETURN','Strike, Return & Reconciliation',50,'RECORD_ACTUAL_USAGE','Record actual resource usage','CONDITIONAL','ASSISTED','WAREHOUSE',array['EVENT','LONG_TERM_RENTAL','INSTALLATION'],false,'CHECKLIST','Actual usage is distinct from plan and reservation.','Material resources actually deployed/consumed are recorded.','Utilization learning relies on plan instead of reality.'),
(90,'RETURN','Strike, Return & Reconciliation',60,'OPEN_MAINTENANCE_DAMAGE','Open maintenance / damage follow-up when required','CONDITIONAL','ASSISTED','WAREHOUSE','{}'::text[],false,'CHECKLIST','Create only from observed issue evidence.','Damage/service issue has owner/status/next action.','Degraded equipment silently returns to stock.'),

(100,'ECONOMICS','Economic Close',10,'CAPTURE_LABOR_ACTUALS','Capture directly caused labor actuals','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Capture enough for contribution without rebuilding payroll.','Relevant labor actuals are linked to the Engagement.','Labor-heavy jobs look artificially profitable.'),
(100,'ECONOMICS','Economic Close',20,'CAPTURE_VENDOR_ACTUALS','Capture vendor, subcontract, rental and purchase actuals','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Use invoice/receipt/accounting evidence when available.','Material external direct costs are linked.','External cost is lost outside engagement economics.'),
(100,'ECONOMICS','Economic Close',30,'CAPTURE_TRAVEL_ACTUALS','Capture travel, lodging, fuel and per-diem actuals','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Use when directly caused by Engagement.','Material travel/logistics actuals are represented.','Remote jobs look more attractive than reality.'),
(100,'ECONOMICS','Economic Close',40,'RECONCILE_SCOPE_CHANGE','Reconcile field scope changes commercially','CONDITIONAL','HUMAN','COMMERCIAL','{}'::text[],true,'CHECKLIST','Use when delivered scope materially changed.','Change is billed, waived, credited or documented intentionally.','Value is delivered without commercial recognition.'),
(100,'ECONOMICS','Economic Close',50,'FINAL_BILLING','Issue final invoice / billing','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Generate from commercial/payment reality.','Required final billing is issued or not applicable.','Revenue conversion to cash stalls.'),
(100,'ECONOMICS','Economic Close',60,'COLLECT_BALANCE','Collect / resolve remaining balance','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],true,'CHECKLIST','Verify payment truth against current evidence.','Balance is paid, scheduled, disputed, waived or owned for collection.','Completed work remains uncollected.'),
(100,'ECONOMICS','Economic Close',70,'CONTRIBUTION_SNAPSHOT','Review Engagement contribution evidence','CONDITIONAL','SYSTEM','COMMERCIAL','{}'::text[],false,'CHECKLIST','Revenue minus directly caused costs with missing evidence visible.','Contribution is exposed or explicitly incomplete.','Revenue-only learning drives poor decisions.'),

(110,'LEARNING','Closeout & Learning',10,'CAPTURE_DELIVERY_OUTCOME','Capture actual delivery outcome','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Record as expected, changed, partial, issue or unknown.','Outcome is represented while memory is fresh.','Business cannot learn from delivery.'),
(110,'LEARNING','Closeout & Learning',20,'CAPTURE_CLIENT_FEEDBACK','Capture meaningful client feedback','CONDITIONAL','HUMAN','COMMERCIAL','{}'::text[],true,'CHECKLIST','Capture useful feedback, not performative survey noise.','Relevant feedback is attached to Engagement/relationship.','Experience quality stays anecdotal.'),
(110,'LEARNING','Closeout & Learning',30,'CAPTURE_AUDIENCE_EXPERIENCE','Capture audience / end-user experience signals','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','LONG_TERM_RENTAL'],true,'MAP_ONLY','Use when observable experience evidence exists.','Meaningful end-user signal is recorded without false precision.','System optimizes equipment delivery rather than outcomes.'),
(110,'LEARNING','Closeout & Learning',40,'CAPTURE_LOCATION_LEARNING','Update venue / site learning','CONDITIONAL','ASSISTED','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE','LONG_TERM_RENTAL'],false,'CHECKLIST','Promote reusable access, infrastructure and logistics lessons.','Reusable learning is attached to normalized location.','Every repeat venue is rediscovered.'),
(110,'LEARNING','Closeout & Learning',50,'CAPTURE_PROCESS_LEARNING','Update process / equipment / solution learning','CONDITIONAL','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Promote repeated/high-leverage learning; do not turn every anecdote into policy.','Useful learning is linked to relevant system knowledge or remains engagement-specific.','Playbook freezes and stops improving.'),
(110,'LEARNING','Closeout & Learning',60,'CAPTURE_CONTRIBUTOR_LEARNING','Capture contributor capability / training signals','CONDITIONAL','HUMAN','PROJECT_MANAGER',array['EVENT','INSTALLATION','SERVICE'],false,'MAP_ONLY','Use for constructive skill/training learning, not surveillance.','Material capability insight is represented at appropriate confidence.','Crew planning never learns from execution.'),
(110,'LEARNING','Closeout & Learning',70,'INSTALL_WARRANTY_SERVICE_PLAN','Establish warranty / support / service follow-on','CONDITIONAL','ASSISTED','COMMERCIAL',array['INSTALLATION'],true,'CHECKLIST','Represent obligations and optional recurring support separately.','Warranty/support responsibility and service opportunity are clear.','Post-install support is ambiguous.'),
(110,'LEARNING','Closeout & Learning',80,'LONG_TERM_EXTENSION_RETURN','Plan extension, renewal, swap or return','CONDITIONAL','ASSISTED','COMMERCIAL',array['LONG_TERM_RENTAL'],true,'CHECKLIST','Begin before current deployment ends.','Next state of deployed capacity is decided.','Asset and relationship fall into an unplanned gap.'),
(110,'LEARNING','Closeout & Learning',90,'COMPLETE_CLOSEOUT','Complete Engagement closeout','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Close only after material obligations are represented.','Closeout captures outcome, learning and unresolved follow-ups.','Job disappears after delivery without durable learning.'),

(120,'RELATIONSHIP','Relationship & Recurrence',10,'CLIENT_FOLLOW_UP','Complete appropriate post-delivery client follow-up','CONDITIONAL','HUMAN','COMMERCIAL','{}'::text[],true,'CHECKLIST','Thank, resolve issues and surface next need without spam.','Relationship has an intentional next movement or is intentionally quiet.','Successful delivery fails to compound trust.'),
(120,'RELATIONSHIP','Relationship & Recurrence',20,'SET_RECURRENCE','Represent renewal / recurrence opportunity','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Use annual events, seasons, service cycles or recurring programs when evidenced.','Next likely recurrence is represented with certainty.','Repeat demand is rediscovered as a cold lead.'),
(120,'RELATIONSHIP','Relationship & Recurrence',30,'UPDATE_RELATIONSHIP_MEMORY','Update relationship memory and role paths','CONDITIONAL','ASSISTED','COMMERCIAL','{}'::text[],false,'CHECKLIST','Preserve planner, venue, referrer and organization relationships.','Reusable relationship path is represented without inventing hierarchy.','Institutional knowledge remains personal memory.'),
(120,'RELATIONSHIP','Relationship & Recurrence',40,'IDENTIFY_SERVICE_FOLLOW_ON','Identify legitimate service / support / expansion follow-on','CONDITIONAL','HUMAN','COMMERCIAL',array['INSTALLATION','LONG_TERM_RENTAL','EQUIPMENT_SALE','SERVICE'],true,'MAP_ONLY','Only when delivered system or relationship creates a real future need.','Follow-on opportunity is represented or intentionally absent.','Installed/deployed base does not compound into recurring value.'),
(120,'RELATIONSHIP','Relationship & Recurrence',50,'CLOSE_OR_ARCHIVE','Close / archive after obligations and next moves are represented','CORE','ASSISTED','PROJECT_MANAGER','{}'::text[],false,'CHECKLIST','Archive rather than erase history.','Operational state is closed and future relationship actions remain separately represented.','Closed work clutters active operations or history is deleted.')
)
insert into public.operating_playbook_steps(
  playbook_id,step_code,phase_order,phase_code,phase_name,sort_order,title,requiredness,automation_mode,default_role_code,
  applies_to_engagement_types,client_touchpoint,procedure_depth,condition_text,completion_definition,risk_if_missed,instruction_summary
)
select pb.id,s.step_code,s.phase_order,s.phase_code,s.phase_name,s.sort_order,s.title,s.requiredness,s.automation_mode,s.default_role_code,
       s.types,s.client_touchpoint,s.procedure_depth,s.condition_text,s.completion_definition,s.risk_if_missed,
       s.condition_text
from pb cross join seed s
on conflict(playbook_id,step_code) do update set
  phase_order=excluded.phase_order,phase_code=excluded.phase_code,phase_name=excluded.phase_name,sort_order=excluded.sort_order,title=excluded.title,
  requiredness=excluded.requiredness,automation_mode=excluded.automation_mode,default_role_code=excluded.default_role_code,
  applies_to_engagement_types=excluded.applies_to_engagement_types,client_touchpoint=excluded.client_touchpoint,procedure_depth=excluded.procedure_depth,
  condition_text=excluded.condition_text,completion_definition=excluded.completion_definition,risk_if_missed=excluded.risk_if_missed,
  instruction_summary=excluded.instruction_summary,active=true,updated_at=now();

-- Map obvious existing actions. A follow-up migration pins all seven current seeded actions deterministically.
update public.work_items w set playbook_step_id=s.id
from public.operating_playbook_steps s join public.operating_playbooks p on p.id=s.playbook_id
where p.code='STAGE_PRESENCE_CORE_LIFECYCLE' and p.version=1 and (
  (w.source_key like 'derived:daily-action:%music-farm%payment%' and s.step_code='VERIFY_PAYMENT_STATE') or
  (w.source_key like 'derived:daily-action:%music-farm%prep%' and s.step_code='CREATE_PULL_PACK') or
  (w.source_key like 'derived:daily-action:%unc%' and s.step_code='FINAL_READINESS_REVIEW') or
  (w.action_type='FOLLOW_UP' and s.step_code='FOLLOW_UP_DECISION') or
  (w.action_type='DELIVERY' and s.step_code='CONFIRM_VENUE_ACCESS')
);

-- Internal/member-only knowledge and tracking. No client access is activated here.
do $$ declare t text; begin
  foreach t in array array['operating_playbooks','operating_playbook_steps','engagement_step_states','engagement_step_assignments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_member_all',t);
    execute format('create policy %I on public.%I for all to authenticated using ((select private.is_app_member())) with check ((select private.is_app_member()))',t||'_member_all',t);
    execute format('revoke all on table public.%I from anon',t);
    execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
  end loop;
end $$;

create or replace view public.playbook_catalog_v with (security_invoker=true) as
select p.id as playbook_id,p.code as playbook_code,p.name as playbook_name,p.version,p.status,
       s.id as step_id,s.phase_order,s.phase_code,s.phase_name,s.sort_order,s.step_code,s.title,s.purpose,
       s.requiredness,s.automation_mode,s.default_role_code,s.default_capability_code,s.applies_to_engagement_types,
       s.condition_text,s.client_touchpoint,s.procedure_depth,s.instruction_summary,s.completion_definition,
       s.evidence_expectation,s.risk_if_missed,s.dependency_step_codes,s.inputs,s.outputs,s.tags
from public.operating_playbooks p join public.operating_playbook_steps s on s.playbook_id=p.id
where p.status='ACTIVE' and s.active=true;
revoke all on table public.playbook_catalog_v from anon;
grant select on table public.playbook_catalog_v to authenticated;

create or replace view public.engagement_job_map_v with (security_invoker=true) as
select e.id as engagement_id,e.engagement_number,e.name as engagement_name,e.engagement_type,
       p.id as playbook_id,p.name as playbook_name,p.version as playbook_version,
       s.id as step_id,s.phase_order,s.phase_code,s.phase_name,s.sort_order,s.step_code,s.title,s.requiredness,
       s.automation_mode,s.default_role_code,s.default_capability_code,s.condition_text,s.client_touchpoint,s.procedure_depth,
       s.completion_definition,s.risk_if_missed,
       st.id as step_state_id,coalesce(st.status,'UNTRACKED') as tracking_status,
       coalesce(st.requirement_state,case when s.requiredness='CORE' then 'REQUIRED' when s.requiredness='OPTIONAL' then 'OPTIONAL' else 'CONDITIONAL' end) as requirement_state,
       st.owner_member_id,tm.username as owner_username,tm.display_name as owner_display_name,
       st.responsible_party_id,rp.name as responsible_party_name,st.due_at,st.due_date,st.started_at,st.completed_at,
       st.completion_notes,st.evidence_summary,st.certainty_state,
       coalesce((select jsonb_agg(jsonb_build_object('assignment_id',a.id,'team_member_id',a.team_member_id,'username',atm.username,'display_name',atm.display_name,'role_code',a.role_code,'role_label',a.role_label,'responsibility_type',esa.responsibility_type,'scope_summary',a.scope_summary,'acknowledgement_state',a.acknowledgement_state) order by esa.responsibility_type,atm.username)
                 from public.engagement_step_assignments esa
                 join public.engagement_assignments a on a.id=esa.engagement_assignment_id
                 join public.team_members atm on atm.id=a.team_member_id
                 where esa.engagement_id=e.id and esa.playbook_step_id=s.id),'[]'::jsonb) as step_assignments
from public.engagements e
join public.operating_playbooks p on p.code='STAGE_PRESENCE_CORE_LIFECYCLE' and p.status='ACTIVE'
join public.operating_playbook_steps s on s.playbook_id=p.id and s.active=true
left join public.engagement_step_states st on st.engagement_id=e.id and st.playbook_step_id=s.id
left join public.team_members tm on tm.id=st.owner_member_id
left join public.parties rp on rp.id=st.responsible_party_id
where e.archived_at is null
  and (cardinality(s.applies_to_engagement_types)=0 or e.engagement_type=any(s.applies_to_engagement_types));
revoke all on table public.engagement_job_map_v from anon;
grant select on table public.engagement_job_map_v to authenticated;

create or replace view public.assignment_brief_v with (security_invoker=true) as
select a.id as assignment_id,a.engagement_id,e.engagement_number,e.name as engagement_name,e.event_start_date,e.venue_name,e.venue_address,
       a.team_member_id,tm.username,tm.display_name,a.role_code,a.role_label,a.assignment_state,a.certainty_state,
       a.scheduled_start,a.scheduled_end,a.scope_summary,a.briefing_notes,a.acceptance_criteria,a.acknowledgement_state,a.acknowledged_at,
       a.location_id,l.name as location_name,l.address as location_address,a.schedule_item_id,
       coalesce((select jsonb_agg(jsonb_build_object('step_id',s.id,'step_code',s.step_code,'phase_code',s.phase_code,'phase_name',s.phase_name,'title',s.title,'responsibility_type',esa.responsibility_type,'completion_definition',s.completion_definition) order by s.phase_order,s.sort_order)
                 from public.engagement_step_assignments esa join public.operating_playbook_steps s on s.id=esa.playbook_step_id
                 where esa.engagement_assignment_id=a.id),'[]'::jsonb) as responsibilities
from public.engagement_assignments a
join public.engagements e on e.id=a.engagement_id
join public.team_members tm on tm.id=a.team_member_id
left join public.locations l on l.id=a.location_id;
revoke all on table public.assignment_brief_v from anon;
grant select on table public.assignment_brief_v to authenticated;

commit;

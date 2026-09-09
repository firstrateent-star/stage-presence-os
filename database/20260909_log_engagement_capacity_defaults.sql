create or replace function private.log_engagement_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  did_log boolean := false;
begin
  if tg_op = 'INSERT' then
    insert into public.events (engagement_id, entity_type, entity_id, event_type, actor_user_id, summary, metadata)
    values (new.id,'engagement',new.id,'ENGAGEMENT_CREATED',uid,'Engagement created',jsonb_build_object('name',new.name,'engagement_number',new.engagement_number));
    return new;
  end if;

  if old.commercial_state is distinct from new.commercial_state then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'COMMERCIAL_STATE_CHANGED',uid,'Commercial state changed',jsonb_build_object('from',old.commercial_state,'to',new.commercial_state));
    did_log := true;
  end if;

  if old.commitment_state is distinct from new.commitment_state then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'COMMITMENT_STATE_CHANGED',uid,'Commitment state changed',jsonb_build_object('from',old.commitment_state,'to',new.commitment_state));
    did_log := true;
  end if;

  if old.operational_state is distinct from new.operational_state then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'OPERATIONAL_STATE_CHANGED',uid,'Operational state changed',jsonb_build_object('from',old.operational_state,'to',new.operational_state));
    did_log := true;
  end if;

  if old.attention_state is distinct from new.attention_state then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'ATTENTION_STATE_CHANGED',uid,'Attention state changed',jsonb_build_object('from',old.attention_state,'to',new.attention_state));
    did_log := true;
  end if;

  if old.default_resource_from_date is distinct from new.default_resource_from_date
     or old.default_resource_through_date is distinct from new.default_resource_through_date
     or old.default_resource_window_state is distinct from new.default_resource_window_state
     or old.default_planned_sourcing_model is distinct from new.default_planned_sourcing_model then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (
      new.id,'engagement',new.id,'CAPACITY_DEFAULTS_UPDATED',uid,'Engagement capacity defaults updated',
      jsonb_build_object(
        'from_date',old.default_resource_from_date,'to_date',new.default_resource_from_date,
        'from_through',old.default_resource_through_date,'to_through',new.default_resource_through_date,
        'from_window_state',old.default_resource_window_state,'to_window_state',new.default_resource_window_state,
        'from_sourcing',old.default_planned_sourcing_model,'to_sourcing',new.default_planned_sourcing_model
      )
    );
    did_log := true;
  end if;

  if old.next_action is distinct from new.next_action
     or old.next_action_at is distinct from new.next_action_at
     or old.next_action_owner_id is distinct from new.next_action_owner_id
     or old.waiting_on is distinct from new.waiting_on
     or old.blocked_reason is distinct from new.blocked_reason then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'NEXT_ACTION_SET',uid,'Next move updated',jsonb_build_object('from_action',old.next_action,'to_action',new.next_action,'from_at',old.next_action_at,'to_at',new.next_action_at,'from_owner',old.next_action_owner_id,'to_owner',new.next_action_owner_id,'from_waiting_on',old.waiting_on,'to_waiting_on',new.waiting_on,'from_blocked_reason',old.blocked_reason,'to_blocked_reason',new.blocked_reason));
    did_log := true;
  end if;

  if old.archived_at is null and new.archived_at is not null then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'ENGAGEMENT_ARCHIVED',uid,'Engagement archived','{}'::jsonb);
    did_log := true;
  end if;

  if not did_log then
    insert into public.events (engagement_id,entity_type,entity_id,event_type,actor_user_id,summary,metadata)
    values (new.id,'engagement',new.id,'ENGAGEMENT_UPDATED',uid,'Engagement updated','{}'::jsonb);
  end if;

  return new;
end;
$$;

revoke all on function private.log_engagement_change() from public;
grant execute on function private.log_engagement_change() to authenticated;

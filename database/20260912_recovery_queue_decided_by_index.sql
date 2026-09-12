create index if not exists recovery_item_decisions_decided_by_idx
  on public.recovery_item_decisions(decided_by)
  where decided_by is not null;

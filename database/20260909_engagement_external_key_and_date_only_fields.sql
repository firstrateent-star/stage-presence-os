-- Goodshuffle import support earned from real project evidence.
-- Allows idempotent external-system imports and preserves date-known/time-unknown reality.

alter table public.engagements
  add column source_key text unique,
  add column event_start_date date,
  add column event_end_date date;

create index engagements_event_start_date_idx
  on public.engagements (event_start_date)
  where archived_at is null;

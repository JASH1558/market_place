-- Run this in Supabase SQL Editor AFTER 004_requests_notifications_ratings.sql
--
-- Adds `notifications` and `interest_requests` to the `supabase_realtime`
-- publication so the notification bell can subscribe to live Postgres
-- changes (INSERT/UPDATE) instead of polling every 30s.
--
-- Realtime's Postgres Changes feature respects each table's row level
-- security policies for the connected user, so a client only ever receives
-- change events for rows they're already allowed to select — the existing
-- policies from 004 (auth.uid() = user_id / buyer_id / seller_id) apply
-- automatically, no extra grants needed here.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'interest_requests'
  ) then
    alter publication supabase_realtime add table interest_requests;
  end if;
end $$;

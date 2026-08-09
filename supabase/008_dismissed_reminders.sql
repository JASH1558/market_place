-- Run this in Supabase SQL Editor AFTER 007_realtime.sql
--
-- Stale-listing reminders (see fetchStaleListingReminders in src/lib/notifications.js)
-- are computed fresh every time the bell opens rather than stored as real
-- notification rows, which meant there was no way to dismiss one — it just
-- came back next time. This table records "user X dismissed the reminder for
-- listing Y" so it can be filtered out afterwards.

create table if not exists dismissed_reminders (
  user_id uuid references auth.users (id) on delete cascade,
  listing_id bigint not null,
  dismissed_at timestamptz default now(),
  primary key (user_id, listing_id)
);

alter table dismissed_reminders enable row level security;

drop policy if exists "Users manage their own dismissed reminders" on dismissed_reminders;
create policy "Users manage their own dismissed reminders"
  on dismissed_reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

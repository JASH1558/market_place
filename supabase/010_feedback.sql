-- Run this in Supabase SQL Editor AFTER 009_reports_and_blocks.sql
--
-- General product feedback — separate from `reports` (which is for flagging
-- a listing/user for trust & safety). Anyone can submit feedback, including
-- signed-out visitors (e.g. someone stuck on the sign-up flow), so unlike
-- every other insert policy in this app this one is NOT gated on
-- auth.uid() = some_owner_id. Reading submitted feedback back is an
-- admin/service-role job via the Supabase dashboard, same as `reports`.

create table if not exists feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text,
  email text,
  category text not null default 'general', -- general | bug | feature_request | compliment | other
  message text not null,
  status text not null default 'new', -- new | reviewed
  created_at timestamptz default now()
);

alter table feedback enable row level security;

drop policy if exists "Anyone can submit feedback" on feedback;
create policy "Anyone can submit feedback"
  on feedback for insert
  with check (true);

-- Signed-in users can see feedback they personally submitted (e.g. to show
-- "you already sent this" in the UI later) — no general SELECT for anyone else.
drop policy if exists "Users can view their own submitted feedback" on feedback;
create policy "Users can view their own submitted feedback"
  on feedback for select
  using (auth.uid() = user_id);

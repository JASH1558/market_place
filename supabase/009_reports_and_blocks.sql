-- Run this in Supabase SQL Editor AFTER 008_dismissed_reminders.sql
--
-- Trust & safety: reporting a listing/user, and blocking a user.
--
-- Blocking is enforced at the RLS level, not just filtered out client-side —
-- once A blocks B, B literally cannot insert a new interest_requests row or
-- a new messages row directed at A (and vice versa isn't required, since a
-- block is meant to stop the blocked person from reaching the blocker, but
-- we make it symmetric here: neither side can newly initiate contact once
-- either has blocked the other. Existing threads/messages aren't deleted —
-- the client hides them, see fetchThreads() in src/lib/messages.js).

-- 1. Reports: a user flags a listing and/or another user, with a reason.
-- Not exposed for general SELECT — only the reporter can see their own
-- submitted reports (e.g. to show "you reported this" in the UI). Reviewing
-- reports is an admin/service-role job, done outside RLS via the dashboard
-- or a future admin tool, not through the anon/authenticated client.
create table if not exists reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users (id) on delete cascade,
  reported_user_id uuid references auth.users (id) on delete cascade,
  listing_id bigint,
  listing_title text,
  reason text not null,
  details text,
  status text not null default 'pending', -- pending | reviewed | dismissed
  created_at timestamptz default now()
);

alter table reports enable row level security;

drop policy if exists "Users can file a report" on reports;
create policy "Users can file a report"
  on reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own submitted reports" on reports;
create policy "Users can view their own submitted reports"
  on reports for select
  using (auth.uid() = reporter_id);

-- 2. Blocked users: one row per (blocker, blocked) pair.
create table if not exists blocked_users (
  blocker_id uuid references auth.users (id) on delete cascade,
  blocked_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

alter table blocked_users enable row level security;

drop policy if exists "Users can view blocks involving them" on blocked_users;
create policy "Users can view blocks involving them"
  on blocked_users for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can block someone" on blocked_users;
create policy "Users can block someone"
  on blocked_users for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can unblock someone" on blocked_users;
create policy "Users can unblock someone"
  on blocked_users for delete
  using (auth.uid() = blocker_id);

-- 3. Helper: true if either user has blocked the other.
create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from blocked_users
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- 4. Tighten interest_requests insert: a buyer can't open a new request
-- with a seller either side has blocked.
drop policy if exists "Buyers can create a request" on interest_requests;
create policy "Buyers can create a request"
  on interest_requests for insert
  with check (
    auth.uid() = buyer_id
    and not public.is_blocked(buyer_id, seller_id)
  );

-- 5. Tighten messages insert the same way — covers the edge case where a
-- thread already existed before a block happened.
drop policy if exists "Participants can send messages in their thread" on messages;
create policy "Participants can send messages in their thread"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from interest_requests r
      where r.id = request_id
        and (r.buyer_id = auth.uid() or r.seller_id = auth.uid())
        and not public.is_blocked(r.buyer_id, r.seller_id)
    )
  );

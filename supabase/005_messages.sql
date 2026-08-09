-- Run this in Supabase SQL Editor AFTER 004_requests_notifications_ratings.sql

-- Chat messages between a buyer and seller, threaded off an interest request.
-- Reusing interest_requests as the thread anchor means no new "conversation"
-- concept is needed — a thread exists exactly when a request does, and the
-- same buyer_id/seller_id pair on that row is what gates access below.
create table if not exists messages (
  id bigint generated always as identity primary key,
  request_id bigint not null references interest_requests (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete cascade,
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

drop policy if exists "Participants can view their thread's messages" on messages;
create policy "Participants can view their thread's messages"
  on messages for select
  using (
    exists (
      select 1 from interest_requests r
      where r.id = request_id
        and (r.buyer_id = auth.uid() or r.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can send messages in their thread" on messages;
create policy "Participants can send messages in their thread"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from interest_requests r
      where r.id = request_id
        and (r.buyer_id = auth.uid() or r.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can mark messages read" on messages;
create policy "Participants can mark messages read"
  on messages for update
  using (
    exists (
      select 1 from interest_requests r
      where r.id = request_id
        and (r.buyer_id = auth.uid() or r.seller_id = auth.uid())
    )
  );

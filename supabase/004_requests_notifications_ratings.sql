-- Run this in Supabase SQL Editor AFTER 003_orders_and_profile_fields.sql

-- 1. Interest requests: buyer expresses interest, seller accepts/declines,
--    buyer then chooses to share their phone number.
create table if not exists interest_requests (
  id bigint generated always as identity primary key,
  listing_id bigint,
  listing_title text,
  listing_image text,
  buyer_id uuid references auth.users (id) on delete cascade,
  buyer_name text,
  seller_id uuid references auth.users (id) on delete cascade,
  message text,
  status text not null default 'pending', -- pending | accepted | declined
  buyer_phone text,
  created_at timestamptz default now(),
  responded_at timestamptz,
  phone_shared_at timestamptz
);

alter table interest_requests enable row level security;

drop policy if exists "Participants can view their requests" on interest_requests;
create policy "Participants can view their requests"
  on interest_requests for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can create a request" on interest_requests;
create policy "Buyers can create a request"
  on interest_requests for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "Participants can update their request" on interest_requests;
create policy "Participants can update their request"
  on interest_requests for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 2. Notifications: one-way messages to a user (accept/decline confirmations,
--    phone-shared alerts, new-interest alerts, etc.)
create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  type text not null, -- interest_request | request_accepted | request_declined | phone_shared
  title text not null,
  body text,
  listing_id bigint,
  request_id bigint,
  read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

drop policy if exists "Users can view their own notifications" on notifications;
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can mark their notifications read" on notifications;
create policy "Users can mark their notifications read"
  on notifications for update
  using (auth.uid() = user_id);

drop policy if exists "Any signed-in user can notify another user" on notifications;
create policy "Any signed-in user can notify another user"
  on notifications for insert
  with check (auth.uid() is not null);

-- 3. Ratings: one rating per order per direction (buyer rates seller, seller
--    rates buyer), only allowed for people who were actually part of that order.
create table if not exists ratings (
  id bigint generated always as identity primary key,
  order_id bigint references orders (id) on delete cascade,
  rater_id uuid references auth.users (id) on delete cascade,
  ratee_id uuid references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (order_id, rater_id)
);

alter table ratings enable row level security;

drop policy if exists "Ratings are viewable by everyone" on ratings;
create policy "Ratings are viewable by everyone"
  on ratings for select
  using (true);

drop policy if exists "Only order participants can rate each other" on ratings;
create policy "Only order participants can rate each other"
  on ratings for insert
  with check (
    auth.uid() = rater_id
    and ratee_id <> rater_id
    and exists (
      select 1 from orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
        and (ratee_id = o.buyer_id or ratee_id = o.seller_id)
    )
  );

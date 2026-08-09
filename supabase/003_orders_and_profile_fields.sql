-- Run this in Supabase SQL Editor AFTER 002_listing_photos.sql

-- 1. Structured academic fields on profiles (replaces the free-text "major" field in the UI)
alter table profiles add column if not exists email text;
alter table profiles add column if not exists degree text;
alter table profiles add column if not exists year smallint;
alter table profiles add column if not exists branch text;

-- Backfill email for existing profiles from auth.users (best effort; needs to be run
-- as the postgres/service role, which the SQL Editor uses by default)
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Keep new signups' profile.email populated too
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.email, new.email);
  return new;
end;
$$ language plpgsql security definer;
-- (trigger "on_auth_user_created" from schema.sql already points at this function)

-- NOTE ON PRIVACY: the existing "Profiles are viewable by everyone" policy from
-- schema.sql means every signed-in visitor can now also read everyone's email via
-- the profiles table (needed so sellers can look up a buyer by campus email when
-- marking something sold). If you'd rather lock that down later, we can move email
-- lookups behind a security-definer function instead of a public column.

-- 2. Cooldown: a listing can only be edited once every 2 hours
alter table listings add column if not exists last_edited_at timestamptz;

create or replace function public.enforce_listing_edit_cooldown()
returns trigger as $$
begin
  if OLD.last_edited_at is not null and (now() - OLD.last_edited_at) < interval '2 hours' then
    raise exception 'You can only edit a listing once every 2 hours. Try again later.';
  end if;
  NEW.last_edited_at = now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists listings_edit_cooldown on listings;
create trigger listings_edit_cooldown
  before update on listings
  for each row execute procedure public.enforce_listing_edit_cooldown();

-- 3. Orders: history of sold items, visible only to the buyer and seller involved
create table if not exists orders (
  id bigint generated always as identity primary key,
  listing_id bigint,
  seller_id uuid references auth.users (id) on delete set null,
  buyer_id uuid references auth.users (id) on delete set null,
  buyer_email text,
  title text,
  description text,
  price numeric,
  category text,
  condition text,
  loc text,
  images text[],
  seller text,
  sold_at timestamptz default now()
);

alter table orders enable row level security;

drop policy if exists "Buyers and sellers can view their own orders" on orders;
create policy "Buyers and sellers can view their own orders"
  on orders for select
  using (auth.uid() = seller_id or auth.uid() = buyer_id);

drop policy if exists "Sellers can record a sale" on orders;
create policy "Sellers can record a sale"
  on orders for insert
  with check (auth.uid() = seller_id);

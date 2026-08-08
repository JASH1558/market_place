-- Run this in your Supabase project's SQL editor (Database > SQL Editor)

-- 1. Profiles table: one row per user, linked to Supabase Auth
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  major text,
  dorm text,
  bio text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- 2. Listings table: items posted for sale
create table if not exists listings (
  id bigint generated always as identity primary key,
  seller_id uuid references auth.users (id) on delete cascade,
  emoji text default '🏷️',
  title text not null,
  price numeric not null default 0,
  seller text,
  loc text,
  category text,
  created_at timestamptz default now()
);

alter table listings enable row level security;

create policy "Listings are viewable by everyone"
  on listings for select
  using (true);

create policy "Users can insert their own listings"
  on listings for insert
  with check (auth.uid() = seller_id);

create policy "Users can update their own listings"
  on listings for update
  using (auth.uid() = seller_id);

create policy "Users can delete their own listings"
  on listings for delete
  using (auth.uid() = seller_id);

-- 3. Auto-create a blank profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

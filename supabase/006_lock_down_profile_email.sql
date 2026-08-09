-- Run this in Supabase SQL Editor AFTER 005_messages.sql
--
-- Problem: the "Profiles are viewable by everyone" policy from schema.sql
-- (using (true)) means the `profiles` table — email column included — can be
-- read in full by anyone with the anon key, e.g. a direct REST call like
-- GET /rest/v1/profiles?select=email,full_name would dump every user's email.
-- RLS is row-level, not column-level, so we can't just "hide" the column with
-- a policy. Fix: lock the base table down to the owner's own row, and expose
-- the safe, non-email columns through a view for everyone else to read.

-- 1. Restrict direct table access to your own row only
drop policy if exists "Profiles are viewable by everyone" on profiles;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- 2. Public view: everything EXCEPT email, readable by anyone (this is what
--    the rest of the app now uses to show another user's name/major/etc.)
drop view if exists public_profiles;
create view public_profiles as
  select id, full_name, degree, year, branch, dorm, bio, created_at
  from profiles;

grant select on public_profiles to anon, authenticated;

-- 3. Security-definer lookup for the "mark as sold" flow, which needs to
--    resolve a buyer's campus email to their user id without giving the
--    client a general-purpose "select * from profiles where email = ..."
--    escape hatch. Only an exact match is returned, and only the id/name —
--    never the email back out — and only signed-in users can call it.
create or replace function public.find_buyer_by_email(lookup_email text)
returns table (id uuid, full_name text)
language sql
security definer
set search_path = public
as $$
  select id, full_name
  from profiles
  where email = lower(trim(lookup_email))
  limit 1;
$$;

revoke all on function public.find_buyer_by_email(text) from public;
grant execute on function public.find_buyer_by_email(text) to authenticated;

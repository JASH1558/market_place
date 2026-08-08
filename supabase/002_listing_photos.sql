-- Run this in Supabase SQL Editor AFTER schema.sql.
-- Adds the fields the new listing form needs, plus a storage bucket for photos.

-- 1. New columns on listings
alter table listings add column if not exists description text;
alter table listings add column if not exists condition text;
alter table listings add column if not exists images text[] default '{}';
alter table listings add column if not exists notes text;

-- Require at least 3 photos per listing (only enforced on new/updated rows)
alter table listings drop constraint if exists listings_min_photos;
alter table listings add constraint listings_min_photos check (array_length(images, 1) >= 3);

-- 2. Storage bucket for listing photos (public read, so images can be shown on the site)
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- 3. Storage policies
drop policy if exists "Public read for listing photos" on storage.objects;
create policy "Public read for listing photos"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "Users can upload their own listing photos" on storage.objects;
create policy "Users can upload their own listing photos"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own listing photos" on storage.objects;
create policy "Users can delete their own listing photos"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

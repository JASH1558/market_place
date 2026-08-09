-- Run this in Supabase SQL Editor AFTER 006_lock_down_profile_email.sql
--
-- Turns on Postgres logical-replication streaming for the tables the app now
-- subscribes to instead of polling: notifications (the bell), interest_requests
-- (accept/decline + phone-share state), and messages (chat). RLS still applies —
-- a client only receives change events for rows its existing select policies
-- already let it read, so this doesn't loosen any of the access rules above.

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.notifications';
  exception when duplicate_object then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.interest_requests';
  exception when duplicate_object then null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.messages';
  exception when duplicate_object then null;
  end;
end $$;

-- Full replica identity so UPDATE/DELETE change events carry the complete old
-- row (needed for reliably matching a row against a client-side filter like
-- seller_id=eq.<uuid> on interest_requests status changes).
alter table public.notifications replica identity full;
alter table public.interest_requests replica identity full;
alter table public.messages replica identity full;

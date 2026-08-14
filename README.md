# the Quad — Campus Marketplace

A React + Vite marketplace app with real Supabase authentication: landing page,
login/signup, and a profile page. Corkboard/flyer visual theme, sticky-note listing
cards.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a new project (free tier is fine).
2. In your project, open **SQL Editor** and run these files **in order**:
   1. `supabase/schema.sql` — `profiles` + `listings` base tables and RLS
   2. `supabase/002_listing_photos.sql` — photo/description/condition columns + the
      `listing-photos` storage bucket
   3. `supabase/003_orders_and_profile_fields.sql` — `profiles.email/degree/year/branch`,
      the listing edit-cooldown trigger, and the `orders` table
   4. `supabase/004_requests_notifications_ratings.sql` — `interest_requests`,
      `notifications`, `ratings`
   5. `supabase/005_messages.sql` — `messages` table for buyer/seller chat, threaded
      off `interest_requests` (needed by the Messages page and the messages badge)
   6. `supabase/006_lock_down_profile_email.sql` — locks `profiles` down to the
      owner's own row and adds the `public_profiles` view used everywhere else in
      the app to show another user's name/major/dorm without exposing email
   7. `supabase/005_realtime.sql` — adds `notifications`/`interest_requests` to the
      realtime publication (note: shares a `005` prefix with `005_messages.sql`;
      they're independent, order between the two doesn't matter, just run both)
   8. `supabase/007_realtime.sql` — adds `messages` to the realtime publication and
      sets full replica identity on all three realtime tables
   9. `supabase/008_dismissed_reminders.sql` — `dismissed_reminders` table, needed
      for the "Dismiss" button on stale-listing reminders in Notifications
   10. `supabase/009_reports_and_blocks.sql` — `reports` + `blocked_users` tables,
       and RLS changes so a block is enforced at the database level (a blocked
       user can't open a new interest request or send a new message to you,
       not just have it hidden client-side)
3. Go to **Project Settings > API** and copy your **Project URL** and **anon public
   key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste in your Project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is safe to expose in client-side code — it's designed for that, and the
row-level security policies in `schema.sql` are what actually protect your data.

## 3. Install and run

```bash
npm install
npm run dev
```

Visit http://localhost:5173.

## 4. Try it

- Sign up with any email on the **Login** page. By default Supabase requires email
  confirmation — check the inbox for that address (or turn confirmation off in
  **Authentication > Providers > Email** while you're developing).
- Once confirmed, log in and you'll land on **Profile**, where you can edit your
  name, major, dorm, and bio — this writes to the `profiles` table.
- The **Landing** page reads from the `listings` table. It's empty at first, so it
  falls back to sample listings so the page doesn't look dead — insert a few rows
  into `listings` (or use "Post something" in the header) to see real data.

## 5. Deploy

This is a static Vite build, so it deploys anywhere: Vercel, Netlify, Cloudflare
Pages, GitHub Pages, etc. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
environment variables in your host's dashboard, then:

```bash
npm run build
```

Deploy the generated `dist/` folder.

## Project structure

```
src/
  components/     Header, ProtectedRoute, shared sticky-note card, dialogs
  lib/            Supabase client, auth context, notifications, messages, ratings
  pages/          Landing, Login, Profile, listings, messages, notifications
supabase/         Run these in order — see "Create a Supabase project" above
```

## What's not built yet

- Search is client-side only, filters just the first 50 loaded listings, and has
  no pagination — anything beyond that isn't reachable by search
- No way for a buyer to withdraw/cancel an interest request they've sent
- No admin UI for reviewing filed reports — they land in the `reports` table and
  need to be reviewed from the Supabase dashboard for now
- Email notifications are stubbed (see the block comment in `src/lib/notifications.js`)
  — they log to the console instead of sending until a provider (Resend/Postmark) is
  wired up through a Supabase Edge Function
- No rate limiting on posting listings or sending interest requests
- No payment processing — buyer and seller settle up outside the app; "mark as
  sold" just records that a sale happened

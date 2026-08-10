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
  into `listings` (or build a "post a listing" form next) to see real data.

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
  components/     Header, ProtectedRoute, shared sticky-note card
  lib/            Supabase client, auth context, sample data
  pages/          Landing, Login, Profile
supabase/
  schema.sql      Run this once in your Supabase SQL editor
```

## What's not built yet

- Posting a new listing (there's a "Post something" button in the header, not wired
  up yet)
- An individual listing detail page
- Search is client-side only and just filters the loaded listings

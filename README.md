# ReelShelf

ReelShelf is a multi-media journal and social discovery app for films, series, and books, built with Next.js App Router and Supabase.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in your Supabase and TMDB values.
3. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

ReelShelf expects these values in `.env.local` and in Vercel production env settings:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_TMDB_API_KEY=
```

Optional compatibility values:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VERCEL_URL=
```

## Supabase setup

Run the SQL in [/Users/ishaankumar/Documents/movie-app-clean/supabase/schema.sql](/Users/ishaankumar/Documents/movie-app-clean/supabase/schema.sql) in Supabase SQL Editor before deploying.

The schema includes:
- profiles
- diary entries
- saved items
- followers
- likes
- comments
- gamification
- weekly challenges
- avatar storage bucket policies

### Auth URLs to add in Supabase

In Supabase:

1. Go to `Authentication` -> `URL Configuration`.
2. Set `Site URL` to your live ReelShelf domain.
3. Add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-PRODUCTION-DOMAIN/auth/callback`
   - `https://YOUR-VERCEL-PREVIEW-DOMAIN/auth/callback` if you want email auth to work on previews

### Avatar uploads

Avatar uploads use the `avatars` Supabase Storage bucket and store public URLs in `profiles.avatar_url`. The SQL schema creates the bucket policies; if uploads fail in production, verify:

1. The `avatars` bucket exists.
2. The bucket is public.
3. Storage policies allow authenticated users to write to `user-id/...` paths.

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add the required env vars from above.
4. Set `NEXT_PUBLIC_SITE_URL` to your real production domain.
5. Redeploy after env vars are saved.

## First external testing checklist

Before sharing with friends, verify:

1. Sign up works from the live URL.
2. Email confirmation returns to `/auth/callback` and then into the app.
3. Profile setup saves username, display name, and avatar.
4. Diary entries save and persist after refresh.
5. Watchlist and Reading Shelf persist after refresh.
6. Public profiles load at `/u/[username]`.
7. Follow, like, and comment interactions work between two test accounts.
8. Notifications appear in the bell and on `/activity`.

## Build verification

```bash
npx tsc --noEmit
npm run build
```

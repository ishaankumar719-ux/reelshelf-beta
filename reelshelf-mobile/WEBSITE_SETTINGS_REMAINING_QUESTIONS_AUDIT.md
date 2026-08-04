# Website Settings — Remaining Questions Audit

Read-only audit. No code was modified on either platform. Scoped to exactly
the 3 unresolved questions below; everything else is treated as already
confirmed per the prior ground-truth table and was not re-checked.

## 1. Profile banner / cover image distinct from avatar

**Finding: confirmed ABSENT.** No such field exists anywhere — data layer or UI.

Evidence:
- `profiles` table schema (direct SQL against production): columns are
  `id, email, created_at, updated_at, username, display_name, avatar_url,
  bio, favourite_film, favourite_series, favourite_book, website_url,
  is_public, favourite_genres, onboarding_completed`. No `banner_url`,
  `cover_url`, or equivalent. No separate `profile_banners`-style table
  exists either (checked `information_schema.tables` for any `%banner%`/
  `%cover%` table name — zero results).
- `src/components/profile/ProfileEditor.tsx` (the real Edit Profile form)
  and `src/components/profile/ProfileShowcase.tsx` (the real profile
  hero/display component): grepped both in full for `banner`/`cover`. The
  only matches are CSS `objectFit: "cover"` on `<img>` elements (an image
  *scaling* property, unrelated to a cover-image *feature*) — no upload UI,
  no banner-specific field, no second image slot anywhere.
- `app/settings/profile/page.tsx` is a bare redirect to `/profile` (7 lines,
  no content of its own) — not a place a banner editor could be hiding.

Avatar (`avatar_url`) is the only profile image field the real website has,
on both platforms.

## 2. In-app "Change Email" for an already-verified account

**Finding: confirmed ABSENT.**

Evidence:
- Repo-wide inventory of every `supabase.auth.*` method call across the
  entire website codebase (`app/`, `src/`, `lib/`, excluding
  `reelshelf-mobile/`): `admin`, `exchangeCodeForSession`, `getClaims`,
  `getSession`, `getUser`, `onAuthStateChange`, `signInWithPassword`,
  `signOut`, `signUp`. **`updateUser` is never called anywhere** — the one
  method a real change-email flow would have to call
  (`supabase.auth.updateUser({ email })`).
- Text search for "Change Email" / "New Email" / "change your email"
  across every `.tsx`/`.ts` file: zero matches.
- No settings/account page exists to host such an action in the first
  place (see the full settings route inventory in §3 below).

Mobile's own "Change email" reference (`app/verify-pending.tsx:87`,
threaded through `app/login.tsx`) is a different thing entirely — it's part
of the pre-confirmation *signup* flow (lets someone who mistyped their
address during sign-up go back and re-enter it before the account is even
confirmed), not a change-email feature for an already-verified, logged-in
account. Neither platform has the latter.

## 3. In-Settings "Change Password" for a logged-in user

**Finding: confirmed ABSENT.**

Evidence:
- Same repo-wide `supabase.auth.*` inventory as above: no `updateUser`
  call anywhere (the method a real "new password while already logged in"
  flow would need — distinct from `resetPasswordForEmail`/`verifyOtp`,
  neither of which appear anywhere in the website codebase either).
- Text search for "Change Password" / "New Password" / "current password" /
  "Current Password": zero matches anywhere in the website codebase.
- Full route inventory of every settings/account-shaped page on the real
  website: `app/settings/appearance/page.tsx`, `app/settings/profile/page.tsx`
  (bare redirect, see §1), `app/settings/import/page.tsx` +
  `ImportClient.tsx`/`ImportWizard.tsx` (a data-import wizard, unrelated).
  No `app/settings/account`, `app/settings/security`, or any page with
  password-related content exists.

Mobile has no in-Settings change-password action either (confirmed via
`app/settings/index.tsx`: Account section is Edit Profile / Log Out /
Delete Account only — no password row). The only password-related flow on
mobile is `forgot-password.tsx` → `reset-password.tsx`, built earlier this
session — a pre-authentication *recovery* flow (works via an emailed
link, never requires knowing the current password), which is a genuinely
different feature from an in-Settings change-password action for someone
already logged in with their current password in hand. Neither platform
has the latter.

## Summary

All three: **confirmed absent on the real website**, evidenced at both the
database-schema level and the full application-code level, not inferred.
Mobile matches this exactly for all three — no gap exists between the two
platforms on any of these three questions, so there is nothing to build or
port.

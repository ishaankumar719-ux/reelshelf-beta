# Website Attachment System Audit — Blueprint for Mobile

> Read-only audit. No code was changed to produce this document — every claim below is traced to
> an actual website file path/line range, a live query against the real production database
> (`gefxnqagnwcsepbksfip`), or both. Read 2026-07-20.

---

## 0. The headline finding

**Image upload is genuinely real** — a working native file picker + Supabase Storage upload, not
a paste-URL stand-in. The "zero real upload rows in production" fact from the task brief is real
but is an **organic usage pattern, not evidence of brokenness**: the code path is fully wired and
functional, real users have simply never happened to use it yet (GIFs being lower-friction than
picking a photo is a plausible, unverifiable reason, not stated anywhere in code).

**"Link" as a third attachment type does not exist as a real feature anywhere on the website**,
despite the database allowing it. This is the audit's other major finding — see §4.

---

## 1. Files read (full)

- `components/AttachmentPicker.tsx` (426 lines) — the actual Image/GIF/Paste-URL picker UI and all
  three buttons' handlers.
- `lib/supabase/storage.ts` (37 lines) — the real upload function.
- `components/diary/DiaryLogModal.tsx` — targeted reads: attachment state wiring (`initialEntry`
  load, `AttachmentPicker` render, save payload).
- `types/diary.ts` — `attachmentType` field type.
- `supabase/migrations/20260508_diary_entry_attachments.sql` — original migration (found to be
  **stale** relative to the live schema, see §2 — same "local migrations folder lags the real
  Supabase project" pattern already confirmed elsewhere in this app's history).
- Live production queries: `pg_constraint` (real check constraint), `diary_entries` (all 7 real
  attachment rows), `storage.buckets` (both candidate buckets), `pg_policies` (real RLS on
  `storage.objects` for both buckets).
- `reelshelf-mobile/components/UniversalReviewComposer.tsx` — targeted read: current mobile
  attachment UI (lines 93-158, 257-301).

---

## 2. Image upload — CONFIRMED REAL, with exact implementation

**Resolved definitively: not paste-URL-only.** `AttachmentPicker.tsx`'s "Image" button
(`:210-232`) does `onClick={() => fileInputRef.current?.click()}`, opening a real hidden
`<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">` (`:198-204`).
`handleFileChange` (`:79-92`) takes the selected `File` object and calls
`uploadAttachment(file)` — a genuine Storage upload, not a URL field.

**`uploadAttachment()`** (`lib/supabase/storage.ts:12-37`), the complete real logic:
1. Client-side size check: reject if `file.size > 10 * 1024 * 1024` (10 MB), before any network call.
2. Client-side MIME allowlist: `["image/jpeg","image/jpg","image/png","image/webp","image/gif"]`.
3. Path: `` `attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}` `` — a flat
   `attachments/` folder prefix inside the bucket, timestamp + random suffix, **no user-id
   segmentation anywhere in the path** (confirmed — this is not an omission in this audit, it's
   the real, live convention).
4. `client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })` —
   `upsert: false` means every upload is a brand-new object; nothing is ever overwritten in place.
5. `getPublicUrl(path)` → the real public Storage CDN URL is what gets saved.
6. **No compression or resize of any kind** — the raw selected file is uploaded as-is (aside from
   the OS's own picker/camera compression, if any, which the website's code has no control over).

## 3. Active storage bucket — CONFIRMED via live query, not inference

**`review-attachments`** (with the "s") is the one real, actively-referenced bucket —
`BUCKET = "review-attachments"` is a literal constant in `storage.ts:5`, confirmed matching the
live bucket's real settings exactly:

| | `review-attachments` (ACTIVE) | `review-attachment` (dead) |
|---|---|---|
| Referenced by any code | Yes — `storage.ts:5` | **No occurrence anywhere in the codebase** (repo-wide grep, zero matches) |
| `public` | true | true |
| `file_size_limit` | 10,485,760 (exactly 10 MB — matches the code's `MAX_BYTES` constant exactly) | `null` (unrestricted) |
| `allowed_mime_types` | `[image/jpeg, image/jpg, image/png, image/webp, image/gif]` (matches the code's allowlist exactly) | `null` (unrestricted) |

The singular-named bucket's unrestricted settings (no size cap, no MIME allowlist) combined with
zero code references anywhere is strong, converging evidence it's leftover/legacy — never
properly configured for real use, never wired to anything.

**Live RLS on `review-attachments`** (`pg_policies`, `storage.objects`):
- INSERT (`auth_upload_review_attachments`): `with_check: bucket_id = 'review-attachments'` — any
  authenticated user may upload, to any path. **No ownership/uid scoping in the policy at all** —
  matches the code's flat, non-user-segmented path convention (§2.3).
- SELECT (`public_read_review_attachments`): `qual: bucket_id = 'review-attachments'` —
  world-readable, no auth required (consistent with `public: true` and the fact these URLs are
  meant to render publicly inside reviews).
- DELETE (`auth_delete_review_attachments`): `qual: bucket_id = 'review-attachments'` — **any
  authenticated user may delete any file in this bucket, not just their own.** No UPDATE policy
  exists at all (consistent with `upsert: false` — the app never attempts in-place overwrite).

---

## 4. "Link" attachment — CONFIRMED NOT A REAL FEATURE, despite DB headroom

This needed real resolution, not assumption, because the task brief's confirmed facts state the
DB allows `'link'` — true, but that is not the same as a real feature existing.

- **Live constraint** (`pg_constraint`, re-verified directly — the local migration file at
  `supabase/migrations/20260508_diary_entry_attachments.sql` is stale and only shows
  `CHECK (attachment_type IN ('image','gif'))`; the live schema has since been extended beyond
  what that local file reflects, same drift pattern already seen elsewhere in this app):
  ```sql
  CHECK ((attachment_type = ANY (ARRAY['image'::text, 'gif'::text, 'link'::text])))
  ```
  `'link'` is a legally valid DB value.
- **But no code path anywhere produces it.** `AttachmentPicker.tsx`'s exported type is
  `AttachmentValue = { url: string; type: "image" | "gif" }` (`:39-42`) — `"link"` is not a valid
  TypeScript value for this field anywhere in the picker. The URL-paste fallback
  (`handleUrlConfirm`, `:110-118`) infers only `"image"` or `"gif"` from the pasted URL's
  extension, never `"link"`. `types/diary.ts:121,142` independently narrows `attachment_type`/
  `attachmentType` to `"image" | "gif" | null` at the type level — the application's own type
  system has never been updated to know `'link'` is a legal DB value.
  Repo-wide grep for any real assignment of `attachment_type`/`attachmentType` to `"link"`:
  **zero matches** anywhere in `app/`, `components/`, `lib/`, `types/`.
  Live data confirms this empirically too: all 7 real `attachment_type` rows are `'gif'`, zero are
  `'link'` (or `'image'`).

**Conclusion: `'link'` is unused schema headroom — likely added preemptively or for a
never-built feature — not a real, exercised website feature.** Nothing exists to "port" for Link.

---

## 5. GIPHY integration — exact details

`components/AttachmentPicker.tsx:15-35`.

- **API key env var**: `NEXT_PUBLIC_GIPHY_API_KEY`, read lazily at call time
  (`process.env.NEXT_PUBLIC_GIPHY_API_KEY`, `:17`) — **confirmed NOT present in this environment's
  actual `.env.local`** (checked directly: only `TMDB_API_KEY`, `NEXT_PUBLIC_TMDB_API_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set). The website's own
  UI has a real, already-built empty state for exactly this case: *"Add `NEXT_PUBLIC_GIPHY_API_KEY`
  to .env.local"* (`:330-333`) — meaning the real website is **also** not functionally exercising
  Giphy in this environment today, for the same missing-key reason. This is an environment/ops gap
  on both platforms equally, not a mobile-behind-web gap.
- **Endpoints**: search — `https://api.giphy.com/v1/gifs/search?api_key={key}&q={query}&limit=18&rating=g`;
  trending (used when the search box is empty) —
  `https://api.giphy.com/v1/gifs/trending?api_key={key}&limit=18&rating=g`.
- **Trigger/debounce**: 400ms debounce on a non-empty search query; 0ms (immediate) when the query
  is empty, i.e. trending loads immediately when the GIF panel opens (`:67-77`).
- **No pagination** — fixed `limit=18`, no offset/cursor param, no "load more" UI. **No explicit
  rate-limit handling** — a failed/non-OK response just silently resolves to an empty result array
  (`:24-30`, plain `try/catch` returning `[]`).
- **Response shape consumed**: `{ data: GiphyGif[] }` where each `GiphyGif` is narrowed to
  `{ id, title, images: { fixed_height_small: { url }, downsized: { url } } }` (`:6-13`) — the
  picker grid renders `images.fixed_height_small.url` as the thumbnail (`:357`), but **saves
  `images.downsized.url`** as the actual attachment (`selectGif`, `:103-108`) — i.e. two different
  Giphy renditions are used for two different purposes, thumbnail vs. stored value.
- **Storage of selected GIF**: the raw `giphy.com` CDN URL is saved directly
  (`onChange({ url: gif.images.downsized.url, type: "gif" })`) — confirmed matching all 7 real
  production rows, which are all literal `media{N}.giphy.com/media/...` URLs. No re-hosting, no
  proxying, no Storage upload for GIFs — only uploaded *images* touch Supabase Storage.
- **Attribution**: "Powered by GIPHY" footer text always shown under the results grid (`:369-373`)
  — required by Giphy's API terms; worth carrying over if mobile integrates the same API.

---

## 6. Link attachment flow

**There is no dedicated "Link" UI or validation logic** — see §4. The closest analog is the
generic "Paste URL" fallback (`:268-286`, `:378-415`): a plain text input, `Enter` key or "Use"
button confirms, `handleUrlConfirm` (`:110-118`) does the only "validation" that exists — trims
whitespace, and if the string is non-empty, infers `type` from the URL's file extension
(`.gif` → `"gif"`, anything else → `"image"`). No URL-format validation (no regex, no `new URL()`
try/catch), no fetch/HEAD check that the URL actually resolves to an image. This exists purely as
a manual fallback for both the Image and GIF buttons when a user wants to paste an external URL
instead of uploading/searching — it is not a third attachment category.

---

## 7. Edit / replace / delete behavior — exact, per type

Read from `AttachmentPicker.tsx`'s full `handleRemove`/`handleFileChange`/`selectGif` and
`DiaryLogModal.tsx`'s edit-load (`:488-492`) and save payload (`:586`).

- **Loading existing state into the composer**: on edit, `attachment` state is initialized from
  `initialEntry.attachmentUrl`/`initialEntry.attachmentType` directly (`DiaryLogModal.tsx:488-492`)
  — whatever type/URL is already stored is shown as the current preview.
- **Replace** (uploading/selecting a new attachment when one already exists): the picker only
  renders its "preview" state (image + remove button) OR its "controls" state (Image/GIF/Paste
  buttons) — never both at once (`AttachmentPicker.tsx:124` gates on `if (value)`). To replace, a
  user must first tap the "×" remove button (clearing `value` to `null`, which reveals the
  controls again), then pick/upload a new one. There is no distinct "replace in place" affordance.
- **Storage cleanup — CONFIRMED: none happens, for any type.** Neither `handleRemove()`
  (`:94-101`, just calls `onChange(null)` and resets local UI state) nor the file-upload path nor
  `selectGif()` ever calls `.remove()`/`.delete()` on Supabase Storage. Combined with §3's finding
  that the DELETE storage policy has no ownership restriction (any authenticated user technically
  *could* delete any file), the real behavior is: **removing or replacing an uploaded image leaves
  the old file permanently orphaned in the `review-attachments` bucket** — it is never cleaned up,
  by anyone, automatically. This is a real, confirmed website behavior (a minor resource-hygiene
  gap on the website itself), not something to silently "fix" while porting — flagged here as
  observed fact, matching the established discipline of documenting real behavior rather than
  porting an idealized version of it.
- **GIFs never need cleanup** — they're always external `giphy.com` URLs, nothing is ever stored
  in Supabase Storage for a GIF selection, so "delete" for a GIF is just clearing the DB reference.

---

## 8. Mobile's current state — for direct comparison

`reelshelf-mobile/components/UniversalReviewComposer.tsx:93-158, 257-301`.

- Three buttons: **Image / GIF / Link** (`:261,265,269`) — note mobile has invented a third
  "Link" button/type that **does not exist as a real feature on the website** (see §4). This is a
  mobile-only addition, not a parity gap to close by building a "real Link feature" — there is
  nothing on the real website to port for it.
- All three buttons funnel into the exact same generic mechanism: `openAttachmentInput(type)`
  opens one shared `TextInput` (`:275-294`) whose placeholder text changes per type
  (`'Paste an image URL…'` / `'Paste a GIF URL…'` / presumably a link-specific placeholder), and
  `confirmAttachment()` (`:145-152`) just writes whatever string was typed directly as
  `attachmentUrl`/`attachmentType` — **no native file picker, no Giphy search, no Supabase Storage
  upload call anywhere in this file.** This matches the file's own prior code comment (confirmed
  in an earlier session pass): "no Supabase Storage upload pipeline is wired yet."
- Mobile's `attachment_type` write is unconstrained client-side (whatever string the `type` param
  is), but would still be validated by the same live DB check constraint
  (`'image'|'gif'|'link'`) on write — so mobile's existing "Link" writes are not schema violations,
  just not-real-website-parity writes.

---

## 9. Feature-by-feature summary table

| Feature | Website reality (evidence) | Current mobile equivalent | Gap | Recommended mobile adaptation |
|---|---|---|---|---|
| Image upload | **Real** — native file picker → `uploadAttachment()` → `review-attachments` bucket, `attachments/{ts}-{rand}.{ext}` path, 10MB/MIME-checked client-side, `upsert:false`, no compression (§2) | Paste-URL text field only, no device picker, no Storage call (§8) | Real gap | Build a real device image picker (`expo-image-picker`, already a dependency — used for avatar upload elsewhere in this app) → upload to the **same** `review-attachments` bucket, same `attachments/` path convention, same 10MB/MIME checks, `upsert:false`. No compression needed to match parity (website has none either). |
| GIF search | **Real** — Giphy search+trending, `NEXT_PUBLIC_GIPHY_API_KEY`, raw giphy.com URL saved (§5) — **but the key is missing from this environment for both platforms equally** | Paste-URL text field only, no Giphy call | Real gap, but **blocked on a missing credential the website itself also lacks here** | Same Giphy search/trending integration, same two endpoints, same `limit=18`/`rating=g`, save `images.downsized.url` exactly as the website does — once a `EXPO_PUBLIC_GIPHY_API_KEY` (or equivalent) is actually provided. Not buildable to a genuinely functional state without that key; a UI-only build with no real key would just reproduce the website's own "Add your API key" empty state. |
| Link attachment | **Not a real feature** — DB allows `'link'`, zero code path ever produces it (§4, §6) | Real UI (3rd button), unused-by-website concept | Not a gap — nothing to port | Decide deliberately: drop mobile's "Link" button to match true website parity, or keep it as an intentional mobile-only affordance (the DB already tolerates the value, so keeping it doesn't require a migration either way) — a product call, not something this audit should silently resolve. |
| Storage bucket | `review-attachments` (with "s") is the only real one; `review-attachment` is dead (§3) | N/A (no Storage use yet) | — | When building real upload, use `review-attachments` — never the singular-named one. |
| Storage RLS | Any authenticated user may INSERT/DELETE any path in the bucket, world-readable SELECT, no ownership scoping (§3) | N/A | — | Mobile's own upload code doesn't need to add ownership logic to match parity (the website doesn't have any) — but worth a conscious decision, not a silent copy, since it's a real permissiveness the website already has. |
| Replace/delete cleanup | Confirmed: **never cleans up old Storage files**, on either replace or explicit remove (§7) | N/A | — | Matching this "gap" exactly would mean deliberately *not* adding cleanup logic mobile doesn't need to invent — faithful porting, not an improvement, per this task's own "do not redesign" principle elsewhere in this session. Worth flagging to the user as a known, shared imperfection rather than silently either replicating or fixing it. |

---

## Open questions for next phase

1. **Giphy key**: needs to be actually obtained/configured (as `EXPO_PUBLIC_GIPHY_API_KEY` or
   similar) before real GIF search can be built to a genuinely working state on mobile — the
   website itself is equally non-functional here today, so this isn't mobile falling behind web,
   it's a shared environment gap.
2. **Link button**: keep as a mobile-only addition, or drop to match true website parity? Real
   product decision, not resolved by this audit.
3. **Storage cleanup on replace/delete**: the website's own real behavior orphans files. Should
   mobile faithfully replicate this (true parity) or fix it as a mobile-side improvement beyond
   what the website does? Also a real decision point, not resolved here.
4. **Ownership-scoped RLS**: the live policies allow any authenticated user to delete any file in
   `review-attachments`. Not something this read-only audit is proposing to change on the website,
   but worth being aware of if mobile's own upload flow is built assuming otherwise.

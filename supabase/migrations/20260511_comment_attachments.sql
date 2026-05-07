-- Optional media attachments on diary entry comments.
-- URL-based only (no storage upload required).
-- attachment_type is inferred from URL on the client and stored for fast display.

alter table public.diary_entry_comments
  add column if not exists attachment_url  text,
  add column if not exists attachment_type text check (attachment_type in ('image', 'gif'));

-- Users can update/delete own comments (for attachment edits later)
drop policy if exists "Users can delete own comments" on public.diary_entry_comments;
create policy "Users can delete own comments"
on public.diary_entry_comments
for delete
to authenticated
using (auth.uid() = user_id);

-- The comment policy still inspected public.profiles to decide whether an
-- entry was public. That table is intentionally owner-only now, which made a
-- legitimate cross-user comment fail its RLS check. Use the existing safe
-- public_profiles view instead; it exposes no private profile fields.
drop policy if exists "Users can comment on public diary entries" on public.diary_entry_comments;

create policy "Users can comment on public diary entries"
  on public.diary_entry_comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.diary_entries de
      join public.public_profiles p on p.id = de.user_id
      where de.id = diary_entry_comments.diary_entry_id
    )
    and (
      parent_comment_id is null
      or exists (
        select 1
        from public.diary_entry_comments parent
        where parent.id = diary_entry_comments.parent_comment_id
          and parent.parent_comment_id is null
          and parent.diary_entry_id = diary_entry_comments.diary_entry_id
      )
    )
  );

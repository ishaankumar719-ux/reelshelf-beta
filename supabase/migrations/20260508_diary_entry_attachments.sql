-- Attachment support for diary/review entries (URL-based, no storage upload required in v1).
-- attachment_type is validated to image or gif for fast client rendering.

alter table public.diary_entries
  add column if not exists attachment_url  text,
  add column if not exists attachment_type text check (attachment_type in ('image', 'gif'));

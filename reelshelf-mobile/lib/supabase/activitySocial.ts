// Diary-entry like/comment — real diary_entry_likes/diary_entry_comments
// tables (RLS confirmed: public SELECT, authenticated INSERT/DELETE/UPDATE),
// ported from the real website's lib/supabase/likes.ts + comments.ts. No
// mobile precedent existed for this before the Activity feed (grep-confirmed
// zero references anywhere in the app) — this is the schema-accurate port,
// not a reimplementation from partial signals.
import { supabase } from './client';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export interface ActivityComment {
  id:               string;
  diaryEntryId:     string;
  parentCommentId:  string | null;
  userId:           string;
  body:             string;
  createdAt:        string;
  username:         string | null;
  displayName:      string | null;
  avatarUrl:        string | null;
  attachmentUrl:    string | null;
  attachmentType:   'image' | 'gif' | null;
}

interface CommentRow {
  id:                string;
  diary_entry_id:    string;
  parent_comment_id: string | null;
  user_id:           string;
  body:              string;
  created_at:        string;
  attachment_url:    string | null;
  attachment_type:   'image' | 'gif' | null;
}

const COMMENT_SELECT = 'id, diary_entry_id, parent_comment_id, user_id, body, created_at, attachment_url, attachment_type';

async function attachProfiles(rows: CommentRow[]): Promise<ActivityComment[]> {
  if (rows.length === 0) return [];
  const client = requireClient();
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await client
    .from('public_profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      diaryEntryId: row.diary_entry_id,
      parentCommentId: row.parent_comment_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      attachmentUrl: row.attachment_url ?? null,
      attachmentType: row.attachment_type ?? null,
    };
  });
}

export async function getLikedDiaryEntryIds(entryIds: string[], currentUserId: string): Promise<string[]> {
  if (!supabase || entryIds.length === 0) return [];
  const { data, error } = await supabase
    .from('diary_entry_likes')
    .select('diary_entry_id')
    .eq('user_id', currentUserId)
    .in('diary_entry_id', entryIds);
  if (error) return [];
  return (data ?? []).map((row) => row.diary_entry_id as string);
}

export async function getLikeCountsForEntries(entryIds: string[]): Promise<Record<string, number>> {
  if (!supabase || entryIds.length === 0) return {};
  const { data } = await supabase
    .from('diary_entry_likes')
    .select('diary_entry_id')
    .in('diary_entry_id', entryIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.diary_entry_id as string] = (counts[row.diary_entry_id as string] ?? 0) + 1;
  }
  return counts;
}

export async function toggleDiaryEntryLike(
  diaryEntryId: string,
  currentlyLiked: boolean,
  currentUserId: string,
): Promise<{ error: string | null; liked: boolean }> {
  const client = requireClient();

  if (currentlyLiked) {
    const { error } = await client
      .from('diary_entry_likes')
      .delete()
      .eq('diary_entry_id', diaryEntryId)
      .eq('user_id', currentUserId);
    if (error) return { error: error.message, liked: true };
    return { error: null, liked: false };
  }

  const { error } = await client
    .from('diary_entry_likes')
    .insert({ diary_entry_id: diaryEntryId, user_id: currentUserId });
  // 23505 = unique_violation (already liked) — treat as success, matching the real website.
  if (error && (error as { code?: string }).code !== '23505') return { error: error.message, liked: false };
  return { error: null, liked: true };
}

export async function getCommentCountsForEntries(entryIds: string[]): Promise<Record<string, number>> {
  if (!supabase || entryIds.length === 0) return {};
  // Root comments only (parent_comment_id IS NULL) — matches the real
  // website's getCommentCountsForEntries exactly (lib/supabase/comments.ts).
  // Replies now exist on mobile too (see createDiaryEntryComment's
  // parentCommentId param) — without this filter, this count would inflate
  // as soon as any reply is posted, double-counting reply + root together.
  const { data } = await supabase
    .from('diary_entry_comments')
    .select('diary_entry_id')
    .in('diary_entry_id', entryIds)
    .is('parent_comment_id', null);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.diary_entry_id as string] = (counts[row.diary_entry_id as string] ?? 0) + 1;
  }
  return counts;
}

export async function getCommentsForEntry(entryId: string): Promise<ActivityComment[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('diary_entry_comments')
    .select(COMMENT_SELECT)
    .eq('diary_entry_id', entryId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return [];
  return attachProfiles((data ?? []) as CommentRow[]);
}

export async function createDiaryEntryComment(input: {
  diaryEntryId:    string;
  body:            string;
  currentUserId:   string;
  /** Set to reply under an existing root comment — matches the real
   *  website's reply model exactly (diary_entry_comments.parent_comment_id).
   *  RLS additionally requires the parent be itself a root comment (no
   *  nested-under-a-reply threading), which this doesn't attempt to bypass. */
  parentCommentId?: string | null;
  attachmentUrl?:   string | null;
  attachmentType?:  'image' | 'gif' | null;
}): Promise<{ error: string | null; comment: ActivityComment | null }> {
  const normalizedBody = input.body.trim();
  const hasAttachment = Boolean(input.attachmentUrl);
  if (!normalizedBody && !hasAttachment) {
    return { error: 'Write something or add an attachment before posting.', comment: null };
  }

  const client = requireClient();
  const { data, error } = await client
    .from('diary_entry_comments')
    .insert({
      diary_entry_id: input.diaryEntryId,
      parent_comment_id: input.parentCommentId ?? null,
      user_id: input.currentUserId,
      body: normalizedBody,
      attachment_url: input.attachmentUrl ?? null,
      attachment_type: input.attachmentType ?? null,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    // Database errors are useful for diagnostics, but should never be shown
    // verbatim in the social UI.
    return { error: 'Your comment could not be posted. Please try again.', comment: null };
  }

  const { data: profile } = await client
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', input.currentUserId)
    .single();

  const row = data as CommentRow;
  return {
    error: null,
    comment: {
      id: row.id,
      diaryEntryId: row.diary_entry_id,
      parentCommentId: row.parent_comment_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      attachmentUrl: row.attachment_url ?? null,
      attachmentType: row.attachment_type ?? null,
    },
  };
}

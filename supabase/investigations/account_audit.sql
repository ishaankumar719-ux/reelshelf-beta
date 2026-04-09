-- Manual read-only investigation query for Supabase SQL Editor.
-- Do not run in application code.
-- Confirms which auth account actually owns the diary data.

SELECT
  au.email,
  au.last_sign_in_at,
  p.username,
  COUNT(d.id) AS diary_entries
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN diary_entries d ON d.user_id = au.id
GROUP BY au.email, au.last_sign_in_at, p.username
ORDER BY diary_entries DESC;

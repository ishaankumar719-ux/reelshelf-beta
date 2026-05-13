insert into public.badges
  (slug, name, description, category, rarity, icon, hidden, requirement_type, requirement_value, xp)
values
  -- ── FILM ────────────────────────────────────────────────────────────────────
  ('first_screening',     'First Screening',       'Log your first film.',                              'film',    'common',    '🎬', false, 'film_count',   1,   50),
  ('film_enthusiast',     'Film Enthusiast',        'Log 10 films.',                                    'film',    'common',    '🍿', false, 'film_count',   10,  50),
  ('film_centennial',     'Film Centennial',        'Log 100 films.',                                   'film',    'rare',      '🎞️', false, 'film_count',   100, 150),
  ('marathon_viewer',     'Marathon Viewer',        'Log 500 films.',                                   'film',    'epic',      '🎭', false, 'film_count',   500, 350),
  ('criterion_minded',    'Criterion Minded',       'Rate 25 films 9 or higher.',                       'film',    'rare',      '📽️', false, 'high_rated',   25,  150),
  ('nolan_archivist',     'Nolan Archivist',        'A badge for those who appreciate precision.',      'film',    'epic',      '⌚', true,  'manual',       1,   350),

  -- ── TV ──────────────────────────────────────────────────────────────────────
  ('pilot_episode',       'Pilot Episode',          'Log your first series.',                           'tv',      'common',    '📺', false, 'tv_count',     1,   50),
  ('binge_mode',          'Binge Mode',             'Log 10 series.',                                   'tv',      'common',    '🛋️', false, 'tv_count',     10,  50),
  ('prestige_television', 'Prestige Television',    'Log 50 series.',                                   'tv',      'rare',      '🏆', false, 'tv_count',     50,  150),
  ('sitcom_survivor',     'Sitcom Survivor',        'Log 25 series.',                                   'tv',      'rare',      '😂', false, 'tv_count',     25,  150),

  -- ── BOOKS ───────────────────────────────────────────────────────────────────
  ('page_turner',         'Page Turner',            'Read your first book.',                            'book',    'common',    '📖', false, 'book_count',   1,   50),
  ('bookworm',            'Bookworm',               'Read 20 books.',                                   'book',    'rare',      '📚', false, 'book_count',   20,  150),
  ('literary_taste',      'Literary Taste',         'Read 50 books.',                                   'book',    'epic',      '🎓', false, 'book_count',   50,  350),
  ('sci_fi_scholar',      'Sci-Fi Scholar',         'A voracious reader of speculative fiction.',       'book',    'rare',      '🚀', true,  'manual',       1,   150),

  -- ── CINEMA ──────────────────────────────────────────────────────────────────
  ('cinema_debut',        'Cinema Debut',           'See a film in the cinema.',                        'cinema',  'common',    '🎪', false, 'cinema_count', 1,   50),
  ('cinema_regular',      'Cinema Regular',         'See 5 films in the cinema.',                       'cinema',  'common',    '🎟️', false, 'cinema_count', 5,   50),
  ('imax_enthusiast',     'IMAX Enthusiast',        'See 10 films in the cinema.',                      'cinema',  'rare',      '📡', false, 'cinema_count', 10,  150),
  ('silver_screen',       'Silver Screen',          'See 25 films in the cinema.',                      'cinema',  'epic',      '🎦', false, 'cinema_count', 25,  350),

  -- ── REVIEWS ─────────────────────────────────────────────────────────────────
  ('first_review',        'First Review',           'Write your first review.',                         'reviews', 'common',    '✍️', false, 'review_count', 1,   50),
  ('critic_in_training',  'Critic in Training',     'Write 10 reviews.',                                'reviews', 'common',    '📝', false, 'review_count', 10,  50),
  ('cultural_commentator','Cultural Commentator',   'Write 50 reviews.',                                'reviews', 'rare',      '🗞️', false, 'review_count', 50,  150),
  ('master_critic',       'Master Critic',          'Write 100 reviews.',                               'reviews', 'epic',      '🏅', false, 'review_count', 100, 350),

  -- ── STREAKS ─────────────────────────────────────────────────────────────────
  ('week_streak',         '7-Day Streak',           'Log 7 days in a row.',                             'streaks', 'common',    '🔥', false, 'streak',       7,   50),
  ('month_streak',        '30-Day Streak',          'Log 30 days in a row.',                            'streaks', 'rare',      '⚡', false, 'streak',       30,  150),
  ('shelf_discipline',    'Shelf Discipline',       'Log 100 days in a row.',                           'streaks', 'epic',      '💎', false, 'streak',       100, 350),
  ('unstoppable',         'Unstoppable',            'Log 365 days in a row.',                           'streaks', 'legendary', '👑', false, 'streak',       365, 750),

  -- ── SOCIAL ──────────────────────────────────────────────────────────────────
  ('first_follower',      'First Follower',         'Get your first follower.',                         'social',  'common',    '👋', false, 'followers',    1,   50),
  ('social_butterfly',    'Social Butterfly',       'Get 10 followers.',                                'social',  'rare',      '🦋', false, 'followers',    10,  150),
  ('conversation_starter','Conversation Starter',   'Receive your first comment.',                      'social',  'common',    '💬', false, 'comments',     1,   50),
  ('critics_circle',      'Critic''s Circle',       'Receive 50 likes on your reviews.',                'social',  'epic',      '⭐', false, 'likes',        50,  350),

  -- ── PRESTIGE ────────────────────────────────────────────────────────────────
  ('founding_member',     'Founding Member',        'An original beta member of ReelShelf.',            'prestige','legendary', '🌟', false, 'manual',       1,   750),
  ('completionist',       'Completionist',          'Earn 10 badges.',                                  'prestige','epic',      '🎯', false, 'badge_count',  10,  350),
  ('reelshelf_scholar',   'ReelShelf Scholar',      'Earn 20 badges.',                                  'prestige','legendary', '🎓', false, 'badge_count',  20,  750)
on conflict (slug) do nothing;

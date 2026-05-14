-- ─────────────────────────────────────────────────────────────────────────────
-- Trivia System
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Question bank
create table if not exists public.trivia_questions (
  id            uuid default gen_random_uuid() primary key,
  category      text not null check (category in ('film', 'tv', 'book')),
  difficulty    text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  question      text not null,
  answers       jsonb not null,       -- string[]  length 4
  correct_index integer not null check (correct_index between 0 and 3),
  explanation   text,
  media_ref     text,
  active        boolean not null default true,
  created_at    timestamptz default now() not null
);

-- 2. Daily rotation (one row per calendar day, one question per category)
create table if not exists public.trivia_daily_rotation (
  rotation_date    date primary key,
  film_question_id uuid references public.trivia_questions(id),
  tv_question_id   uuid references public.trivia_questions(id),
  book_question_id uuid references public.trivia_questions(id),
  created_at       timestamptz default now() not null
);

-- 3. User answers  (unique per user × day × category)
create table if not exists public.trivia_answers (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  question_id    uuid not null references public.trivia_questions(id),
  rotation_date  date not null,
  category       text not null check (category in ('film', 'tv', 'book')),
  selected_index integer not null,
  is_correct     boolean not null,
  xp_earned      integer not null default 0,
  answered_at    timestamptz default now() not null,
  unique (user_id, rotation_date, category)
);

-- 4. Per-user progress counters and streaks
create table if not exists public.trivia_user_progress (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  film_streak    integer not null default 0,
  tv_streak      integer not null default 0,
  book_streak    integer not null default 0,
  film_correct   integer not null default 0,
  tv_correct     integer not null default 0,
  book_correct   integer not null default 0,
  total_correct  integer not null default 0,
  longest_streak integer not null default 0,
  last_film_date date,
  last_tv_date   date,
  last_book_date date,
  updated_at     timestamptz default now() not null
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.trivia_questions      enable row level security;
alter table public.trivia_daily_rotation enable row level security;
alter table public.trivia_answers        enable row level security;
alter table public.trivia_user_progress  enable row level security;

create policy "trivia_q_read"       on public.trivia_questions      for select using (true);
create policy "trivia_rot_read"     on public.trivia_daily_rotation  for select using (true);
create policy "trivia_ans_own_read" on public.trivia_answers         for select using (auth.uid() = user_id);
create policy "trivia_ans_insert"   on public.trivia_answers         for insert with check (auth.uid() = user_id);
create policy "trivia_prog_all"     on public.trivia_user_progress   for all   using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Badge category constraint ───────────────────────────────────────────────
alter table public.badges drop constraint if exists badges_category_check;
alter table public.badges add constraint badges_category_check
  check (category in ('film','tv','book','cinema','reviews','streaks','social','prestige','legacy','trivia'));

-- ─── Trivia badges ───────────────────────────────────────────────────────────
insert into public.badges (slug, name, description, category, rarity, icon, hidden, requirement_type, requirement_value, xp, is_limited)
values
  ('trivia_film_scholar',        'Film Scholar',         'Answered 10 daily film trivia questions correctly.',          'trivia', 'rare',      '🎓', false, 'manual', 1, 150, false),
  ('trivia_tv_savant',           'TV Savant',            'Answered 10 daily TV trivia questions correctly.',            'trivia', 'rare',      '📡', false, 'manual', 1, 150, false),
  ('trivia_page_turner',         'Page Turner',          'Answered 10 daily book trivia questions correctly.',          'trivia', 'rare',      '📚', false, 'manual', 1, 150, false),
  ('trivia_daily_projectionist', 'Daily Projectionist',  'Maintained a 7-day trivia streak in any category.',          'trivia', 'epic',      '🎞️', false, 'manual', 1, 250, false),
  ('trivia_historian',           'ReelShelf Historian',  'Answered 50 trivia questions correctly across all topics.',   'trivia', 'epic',      '🏛️', false, 'manual', 1, 300, false),
  ('trivia_perfect_screening',   'Perfect Screening',    'Answered all 3 trivia categories correctly on the same day.', 'trivia', 'legendary', '✨',  false, 'manual', 1, 400, false)
on conflict (slug) do nothing;

-- ─── Seed: Film questions ─────────────────────────────────────────────────────
insert into public.trivia_questions (category, difficulty, question, answers, correct_index, explanation, media_ref) values

('film','easy',
 'Who directed "Citizen Kane" (1941)?',
 '["Orson Welles","Alfred Hitchcock","John Huston","Billy Wilder"]',
 0,
 'Orson Welles co-wrote, produced, directed, and starred in Citizen Kane at just 25 years old. It is widely regarded as one of the greatest films ever made.',
 'Citizen Kane (1941)'),

('film','medium',
 'In "The Godfather" (1972), which actor plays Michael Corleone?',
 '["Robert De Niro","Al Pacino","Jack Nicholson","Dustin Hoffman"]',
 1,
 'Al Pacino plays Michael Corleone, the youngest Corleone son who reluctantly becomes head of the crime family after his father is shot.',
 'The Godfather (1972)'),

('film','hard',
 'Which film won the Academy Award for Best Picture at the very first ceremony in 1929?',
 '["Wings","Sunrise","The Jazz Singer","7th Heaven"]',
 0,
 'Wings (1927) won the first Oscar for Outstanding Picture held May 16, 1929. It remains the only silent film ever to win Best Picture.',
 'Wings (1927)'),

('film','medium',
 'In "2001: A Space Odyssey", what is the ship''s AI computer named?',
 '["WALL-E","HAL 9000","Deep Thought","Skynet"]',
 1,
 'HAL 9000 (Heuristically Programmed ALgorithmic Computer) is the ship''s AI in Kubrick''s 1968 masterpiece, famous for "I''m sorry Dave, I''m afraid I can''t do that."',
 '2001: A Space Odyssey (1968)'),

('film','easy',
 'Which actor played the Joker in "The Dark Knight" (2008)?',
 '["Jack Nicholson","Jared Leto","Heath Ledger","Joaquin Phoenix"]',
 2,
 'Heath Ledger''s posthumous portrayal won him the Academy Award for Best Supporting Actor. He passed away months before the film''s release.',
 'The Dark Knight (2008)'),

('film','hard',
 'Who composed the iconic score for "Psycho" (1960)?',
 '["Ennio Morricone","Bernard Herrmann","John Williams","Nino Rota"]',
 1,
 'Bernard Herrmann''s shrieking string arrangements for Psycho are among the most recognisable pieces of film music ever composed.',
 'Psycho (1960)'),

('film','medium',
 'In "Pulp Fiction" (1994), what is inside the mysterious briefcase?',
 '["Gold bars","It is never revealed","A diamond","Drug money"]',
 1,
 'Quentin Tarantino confirmed the contents are never revealed. The glowing briefcase is a MacGuffin — its literal contents are irrelevant to the story.',
 'Pulp Fiction (1994)'),

('film','easy',
 'What does Forrest Gump compare life to in the 1994 film?',
 '["A rollercoaster","A box of chocolates","A long journey","A game of chess"]',
 1,
 '"Life is like a box of chocolates — you never know what you''re gonna get." One of cinema''s most quoted lines, the film won Best Picture that year.',
 'Forrest Gump (1994)'),

('film','hard',
 'What was the first feature-length animated film Disney ever released?',
 '["Bambi","Pinocchio","Snow White and the Seven Dwarfs","Fantasia"]',
 2,
 'Snow White and the Seven Dwarfs (1937) was Disney''s first animated feature and the first cel-animated feature-length film in motion picture history.',
 'Snow White and the Seven Dwarfs (1937)'),

('film','medium',
 'Which country produced "Seven Samurai" (1954)?',
 '["China","South Korea","Japan","Vietnam"]',
 2,
 'Directed by Akira Kurosawa, Seven Samurai is a landmark of Japanese cinema and one of the most influential films ever made, inspiring countless westerns.',
 'Seven Samurai (1954)');

-- ─── Seed: TV questions ───────────────────────────────────────────────────────
insert into public.trivia_questions (category, difficulty, question, answers, correct_index, explanation, media_ref) values

('tv','easy',
 'In "Breaking Bad", what criminal alias does Walter White adopt?',
 '["El Jefe","Heisenberg","The Cook","Walter White"]',
 1,
 'Walter White adopts the alias "Heisenberg," named after physicist Werner Heisenberg, known for the uncertainty principle — apt for a man whose identity becomes increasingly uncertain.',
 'Breaking Bad (2008–2013)'),

('tv','medium',
 'In the US version of "The Office", what city is Dunder Mifflin''s branch located in?',
 '["Albany, New York","Denver, Colorado","Scranton, Pennsylvania","Pittsburgh, Pennsylvania"]',
 2,
 'The Office is set in Scranton, Pennsylvania. The show premiered on NBC in 2005 as an adaptation of the UK series by Ricky Gervais.',
 'The Office (2005–2013)'),

('tv','hard',
 'Which TV show coined the phrase "jumping the shark"?',
 '["Seinfeld","Happy Days","M*A*S*H","Laverne & Shirley"]',
 1,
 '"Jumping the shark" comes from a Happy Days episode where Fonzie water-skis over a shark. It now describes the moment a TV show''s quality begins to irreversibly decline.',
 'Happy Days (1974–1984)'),

('tv','medium',
 'What is the name of Tony Soprano''s psychiatrist in "The Sopranos"?',
 '["Dr. Melfi","Dr. Cusamano","Dr. Krakower","Dr. Melman"]',
 0,
 'Dr. Jennifer Melfi, played by Lorraine Bracco, is Tony Soprano''s therapist throughout the series. Their dynamic is one of its most compelling narrative threads.',
 'The Sopranos (1999–2007)'),

('tv','easy',
 'What is the name of the coffee shop in "Friends"?',
 '["Jitters","Central Perk","The Coffee Bean","Grounded"]',
 1,
 'Central Perk is the iconic Manhattan coffee shop where the six Friends regulars spend an implausible amount of time on the famous orange couch.',
 'Friends (1994–2004)'),

('tv','hard',
 'What year did the pilot episode of "Twin Peaks" air?',
 '["1988","1990","1992","1994"]',
 1,
 'Twin Peaks premiered on April 8, 1990, on ABC. David Lynch and Mark Frost''s surrealist mystery fundamentally changed what prestige television could be.',
 'Twin Peaks (1990–1991, 2017)'),

('tv','medium',
 'In "Succession", what is the surname of the media dynasty at the show''s centre?',
 '["Murdoch","Pierce","Waystar","Roy"]',
 3,
 'The Roy family — Logan, Kendall, Siobhan, Roman, and Connor — are the central dynasty in Succession, loosely inspired by Rupert Murdoch''s media empire.',
 'Succession (2018–2023)'),

('tv','easy',
 'What is the seat of power contested throughout "Game of Thrones"?',
 '["The Dragon Throne","The Iron Throne","The Stone Throne","The Golden Throne"]',
 1,
 'The Iron Throne, forged from the swords of Aegon the Conqueror''s defeated enemies, is the seat of power for the ruler of the Seven Kingdoms.',
 'Game of Thrones (2011–2019)'),

('tv','hard',
 'How many seasons does "The Wire" have?',
 '["4","5","6","7"]',
 1,
 'The Wire ran for 5 seasons on HBO from 2002 to 2008. Each season examined a different institution of Baltimore society: the drug trade, docks, politics, schools, and press.',
 'The Wire (2002–2008)'),

('tv','medium',
 'Which streaming platform produced "House of Cards" (US), marking the arrival of prestige streaming drama?',
 '["Amazon Prime Video","Hulu","HBO","Netflix"]',
 3,
 'House of Cards (2013) was the first major Netflix original series, pioneering the binge-release model and signalling that streaming could produce prestige television.',
 'House of Cards (2013–2018)');

-- ─── Seed: Book questions ─────────────────────────────────────────────────────
insert into public.trivia_questions (category, difficulty, question, answers, correct_index, explanation, media_ref) values

('book','easy',
 'Who wrote "1984"?',
 '["Aldous Huxley","George Orwell","Ray Bradbury","Kurt Vonnegut"]',
 1,
 'George Orwell (pen name of Eric Arthur Blair) published 1984 in 1949. The novel introduced Big Brother, doublethink, and Newspeak into the cultural lexicon.',
 '1984 by George Orwell (1949)'),

('book','medium',
 'What year was "To Kill a Mockingbird" first published?',
 '["1955","1960","1962","1957"]',
 1,
 'Harper Lee''s To Kill a Mockingbird was published on July 11, 1960, and won the Pulitzer Prize in Fiction the following year.',
 'To Kill a Mockingbird (1960)'),

('book','easy',
 'Who wrote "The Great Gatsby"?',
 '["Ernest Hemingway","F. Scott Fitzgerald","John Steinbeck","William Faulkner"]',
 1,
 'F. Scott Fitzgerald published The Great Gatsby in 1925. Though initially a modest seller, it has become a defining novel of the American Dream.',
 'The Great Gatsby (1925)'),

('book','hard',
 'What is the opening line of Jane Austen''s "Pride and Prejudice"?',
 '["It was the best of times, it was the worst of times.","It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.","Call me Ishmael.","Happy families are all alike; every unhappy family is unhappy in its own way."]',
 1,
 'Austen''s opening from Pride and Prejudice (1813) is one of literature''s most famous lines, immediately establishing the novel''s satirical tone on marriage and social class.',
 'Pride and Prejudice (1813)'),

('book','medium',
 'In what fictional Colombian town is "One Hundred Years of Solitude" primarily set?',
 '["Aracataca","Bogotá","Macondo","Cartagena"]',
 2,
 'Gabriel García Márquez set his masterpiece in the fictional town of Macondo, mirroring the history and geography of Colombia through the lens of magical realism.',
 'One Hundred Years of Solitude (1967)'),

('book','easy',
 'Who wrote "The Catcher in the Rye"?',
 '["Jack Kerouac","J.D. Salinger","Philip Roth","Norman Mailer"]',
 1,
 'J.D. Salinger published The Catcher in the Rye in 1951. Narrated by Holden Caulfield, it remains one of the most controversial and widely read American novels.',
 'The Catcher in the Rye (1951)'),

('book','hard',
 'In what Russian city is "Crime and Punishment" primarily set?',
 '["Moscow","St. Petersburg","Kiev","Kazan"]',
 1,
 'Fyodor Dostoevsky set Crime and Punishment (1866) in St. Petersburg. The city''s oppressive heat and cramped tenements mirror protagonist Raskolnikov''s psychological torment.',
 'Crime and Punishment (1866)'),

('book','easy',
 'Who wrote "Harry Potter and the Philosopher''s Stone"?',
 '["J.R.R. Tolkien","J.K. Rowling","C.S. Lewis","Roald Dahl"]',
 1,
 'J.K. Rowling published Harry Potter and the Philosopher''s Stone in 1997. The series has sold over 500 million copies and become a defining cultural phenomenon.',
 'Harry Potter and the Philosopher''s Stone (1997)'),

('book','hard',
 'What is the name of the theocratic republic in "The Handmaid''s Tale"?',
 '["Panem","Gilead","Oceania","Airstrip One"]',
 1,
 'Margaret Atwood''s The Handmaid''s Tale (1985) is set in the Republic of Gilead, a totalitarian theocracy built on the ruins of the United States.',
 'The Handmaid''s Tale (1985)'),

('book','medium',
 'Which author wrote "Consider the Lobster", a celebrated collection of literary essays?',
 '["David Foster Wallace","Joan Didion","Tom Wolfe","Hunter S. Thompson"]',
 0,
 'David Foster Wallace''s Consider the Lobster (2005) ranges from the ethics of eating lobsters alive to the rhetoric of political speeches — exemplifying his restless, digressive genius.',
 'Consider the Lobster (2005)');

-- Trivia question expansion: 50 film, 30 TV, 20 book (100 total)
-- Schema: difficulty in ('easy','medium','hard'), answers JSONB, correct_index 0-based

INSERT INTO trivia_questions (category, difficulty, question, answers, correct_index, explanation, media_ref) VALUES

-- ─── FILM (50) ───────────────────────────────────────────────────────────────

('film', 'medium', 'In Interstellar, which planet is orbiting the black hole Gargantua where one hour equals seven years on Earth?',
 '["Miller''s Planet","Mann''s Planet","Edmund''s Planet","Endurance Station"]', 0,
 'Miller''s Planet sits so close to Gargantua''s event horizon that gravitational time dilation makes 1 hour equal 7 Earth years. The crew lose 23 years during their brief visit.',
 'Interstellar (2014)'),

('film', 'hard', 'What piece of music is Fletcher conducting when he throws a chair at Andrew in Whiplash?',
 '["Caravan","Whiplash","Hank Levy''s 17/8","Fletcher''s Song"]', 0,
 'Duke Ellington''s "Caravan" is the piece being rehearsed during Fletcher''s infamous chair-throwing outburst. The film''s title track is played later in the climactic concert.',
 'Whiplash (2014)'),

('film', 'easy', 'Which South Korean film became the first non-English film to win the Academy Award for Best Picture?',
 '["Parasite","Spirited Away","Pan''s Labyrinth","Amour"]', 0,
 'Bong Joon-ho''s Parasite won four Oscars at the 2020 ceremony including Best Picture, Best Director, Best Original Screenplay, and Best International Feature Film.',
 'Parasite (2019)'),

('film', 'medium', 'In Dune (2021), what is the name of the spice that makes interstellar travel possible?',
 '["Melange","Spice Blend","Arrakium","Sandworm Extract"]', 0,
 'Melange — known simply as "the spice" — is the most valuable substance in the universe. It extends life, enhances mental abilities, and enables the Guild Navigators to fold space.',
 'Dune (2021)'),

('film', 'easy', 'What is the Joker''s real name as revealed in The Dark Knight?',
 '["Never revealed","Jack Napier","Arthur Fleck","Jerome Valeska"]', 0,
 'The Joker''s true identity is deliberately never revealed in The Dark Knight, reinforcing his unpredictability. Heath Ledger''s Joker says "do you wanna know how I got these scars?" but never gives a real name.',
 'The Dark Knight (2008)'),

('film', 'hard', 'In Fight Club, what is the first rule of Fight Club?',
 '["You do not talk about Fight Club","You do not join Fight Club","Always wear a mouthguard","Fights end when someone taps out"]', 0,
 '"The first rule of Fight Club is: you do not talk about Fight Club." Tyler Durden recites this rule twice during the founding meeting in the basement bar.',
 'Fight Club (1999)'),

('film', 'medium', 'Which animated film won the Oscar for Best Animated Feature in the same year Spider-Man: Into the Spider-Verse was eligible?',
 '["Spider-Man: Into the Spider-Verse","Isle of Dogs","Incredibles 2","Ralph Breaks the Internet"]', 0,
 'Spider-Man: Into the Spider-Verse itself won Best Animated Feature at the 2019 Oscars (91st Academy Awards), defeating heavy competition from Incredibles 2 and Isle of Dogs.',
 'Spider-Man: Into the Spider-Verse (2018)'),

('film', 'medium', 'In La La Land, what is the name of the jazz club Seb dreams of opening?',
 '["Seb''s","The Blue Note","Mia''s Place","Casa Blanca Jazz"]', 0,
 'Seb dreams of opening a jazz club called "Seb''s" — shown on his business card and in the film''s bittersweet ending, where Mia sees the club fully realised years later.',
 'La La Land (2016)'),

('film', 'hard', 'Mark Zuckerberg''s estimated net worth at the start of The Social Network is shown during his deposition. What year does the deposition take place?',
 '["2003","2004","2006","2008"]', 3,
 'The framing device of The Social Network is set during 2008 depositions as Zuckerberg faces two separate lawsuits — from the Winklevoss twins and from Eduardo Saverin.',
 'The Social Network (2010)'),

('film', 'medium', 'In The Departed, which Boston criminal organization does Frank Costello run?',
 '["Irish mob","Italian mafia","Russian Bratva","Chinese Triad"]', 0,
 'Frank Costello (Jack Nicholson) leads a South Boston Irish mob. The film is a remake of the Hong Kong film Infernal Affairs, transplanted to Boston''s Irish-American criminal underworld.',
 'The Departed (2006)'),

('film', 'easy', 'In Inception, what object does Cobb use as his totem to distinguish dreams from reality?',
 '["A spinning top","A poker chip","A die","A coin"]', 0,
 'Cobb''s totem is a spinning top — in reality it will eventually fall, but in a dream it spins indefinitely. The film''s ambiguous final shot never shows it stop.',
 'Inception (2010)'),

('film', 'easy', 'How many films are in Peter Jackson''s original Lord of the Rings trilogy?',
 '["3","2","4","6"]', 0,
 'The Lord of the Rings trilogy comprises The Fellowship of the Ring (2001), The Two Towers (2002), and The Return of the King (2003), which won all 11 Oscars it was nominated for.',
 'The Lord of the Rings (2001–2003)'),

('film', 'hard', 'What film is playing at the cinema in Babylon (2022) during the final montage sequence?',
 '["Singin'' in the Rain","The Jazz Singer","Sunset Boulevard","City Lights"]', 0,
 'Damien Chazelle''s Babylon ends with Manny watching Singin'' in the Rain in a cinema years later, weeping as he sees the Hollywood of his era refracted through a loving musical tribute.',
 'Babylon (2022)'),

('film', 'medium', 'In Goodfellas, what does Henry Hill say he always wanted to be since he was a child?',
 '["A gangster","A made man","A wiseguy","A capo"]', 0,
 '"As far back as I can remember, I always wanted to be a gangster." — Henry Hill''s opening narration sets the tone for Scorsese''s biography of real-life mobster Henry Hill.',
 'Goodfellas (1990)'),

('film', 'hard', 'In The Prestige, what is the name of the "transported man" trick that obsesses both magicians?',
 '["The Transported Man","The Prestige","The Pledge","The Turn"]', 0,
 'The Transported Man is the illusion where a magician enters a box and instantaneously appears across the stage. Angier discovers Borden''s secret — he uses his identical twin — and Tesla builds him a machine.',
 'The Prestige (2006)'),

('film', 'medium', 'No Country for Old Men is based on a novel by which author?',
 '["Cormac McCarthy","Stephen King","Don DeLillo","Philip Roth"]', 0,
 'Cormac McCarthy''s 2005 novel No Country for Old Men was adapted by the Coen Brothers into the 2007 Best Picture winner. McCarthy also wrote The Road and Blood Meridian.',
 'No Country for Old Men (2007)'),

('film', 'hard', 'In There Will Be Blood, what does Daniel Plainview use to convince the Sunday family to sell their land?',
 '["He claims it''s for a water pipeline","He offers cash","He threatens them","He fakes a friendship with Eli"]', 0,
 'Plainview poses as a quail hunter and tells the Sundays he''s building a water pipeline, concealing his true purpose of oil drilling until he has the land under option.',
 'There Will Be Blood (2007)'),

('film', 'easy', 'Oppenheimer (2023) is directed by which filmmaker?',
 '["Christopher Nolan","Denis Villeneuve","David Fincher","Ridley Scott"]', 0,
 'Christopher Nolan directed Oppenheimer, which stars Cillian Murphy as J. Robert Oppenheimer and won seven Oscars including Best Picture and Best Director.',
 'Oppenheimer (2023)'),

('film', 'hard', 'In Mulholland Drive, what is the name of the blue-haired woman''s real identity?',
 '["Diane Selwyn","Betty Elms","Rita Hayworth","Camilla Rhodes"]', 0,
 'The blue-haired woman is Diane Selwyn — the "Betty and Rita" story is Diane''s idealised dream. She''s a failed actress who hired a hitman to kill Camilla and is consumed by guilt.',
 'Mulholland Drive (2001)'),

('film', 'medium', 'In Eternal Sunshine of the Spotless Mind, what company erases Joel and Clementine''s memories?',
 '["Lacuna Inc.","Memorex Corp.","MindErase","Spotless Systems"]', 0,
 'Lacuna Inc. (named after a gap or void) performs the memory erasure procedure. The company was founded by Dr. Howard Mierzwiak.',
 'Eternal Sunshine of the Spotless Mind (2004)'),

('film', 'hard', 'What classical piece plays over the opening of Apocalypse Now?',
 '["The End by The Doors","Ride of the Valkyries","Suzie Q by CCR","This is the End"]', 0,
 'The Doors'' "The End" plays over Willard''s hotel room breakdown and Kurtz''s compound in the opening — one of cinema''s most iconic marriages of music and image.',
 'Apocalypse Now (1979)'),

('film', 'medium', 'In The Shining, what does Danny''s imaginary friend Tony write on the door?',
 '["REDRUM","MURDER","OVERLOOK","DANNY"]', 0,
 'Danny writes "REDRUM" (murder backwards) on the door with his mother''s lipstick while in a trance. Wendy only realises its meaning when she sees the mirror reflection.',
 'The Shining (1980)'),

('film', 'hard', 'Killers of the Flower Moon is based on a true story. What Native American nation is at the center of the murders?',
 '["Osage Nation","Cherokee Nation","Comanche Nation","Sioux Nation"]', 0,
 'The film chronicles the Osage Indian Murders in 1920s Oklahoma, where members of the Osage Nation — who had become wealthy from oil rights — were systematically killed by white settlers.',
 'Killers of the Flower Moon (2023)'),

('film', 'easy', 'In Everything Everywhere All at Once, what tax-related business does Evelyn run?',
 '["A laundromat","A convenience store","A nail salon","A restaurant"]', 0,
 'Evelyn Wang runs a struggling laundromat with her husband Waymond. The IRS audit that opens the film triggers the multiverse-hopping adventure.',
 'Everything Everywhere All at Once (2022)'),

('film', 'medium', 'Blade Runner 2049 is set how many years after the original Blade Runner?',
 '["30 years","20 years","50 years","10 years"]', 0,
 'Blade Runner 2049 is set in 2049, exactly 30 years after the original film (set in 2019). K discovers a secret that could destabilise society.',
 'Blade Runner 2049 (2017)'),

('film', 'hard', 'In Moonlight, what are the three names of the main character across the three chapters?',
 '["Little, Chiron, Black","Chiron, Kevin, Black","Boy, Teen, Man","Junior, Chiron, Kevin"]', 0,
 'The three chapters are titled "i. Little," "ii. Chiron," and "iii. Black" — tracking the protagonist''s identity across childhood, adolescence, and adulthood.',
 'Moonlight (2016)'),

('film', 'medium', 'In The Wolf of Wall Street, what drug does Jordan Belfort''s team take that is the focus of a long comedic sequence?',
 '["Quaaludes","Cocaine","Heroin","Ecstasy"]', 0,
 'Jordan takes an extraordinarily potent batch of Quaaludes (methaqualone) that causes him to crawl to his car and drive home while completely incapacitated — one of the film''s most famous sequences.',
 'The Wolf of Wall Street (2013)'),

('film', 'hard', 'In Mad Max: Fury Road, what is Immortan Joe''s real physical condition that he hides beneath his armor?',
 '["He is severely burned and wears a breathing apparatus","He is quadriplegic","He has no legs","He is blind"]', 0,
 'Immortan Joe''s torso is covered in suppurating tumors and lesions, concealed under his metal armor. His breathing mask filters the air and maintains his status as a godlike figure.',
 'Mad Max: Fury Road (2015)'),

('film', 'medium', 'Django Unchained is set in which time period?',
 '["Antebellum South, 1858","Post-Civil War, 1870","Civil War, 1864","Colonial America, 1776"]', 0,
 'The film is set two years before the Civil War in the antebellum South (1858). Tarantino described it as a Southern — a Spaghetti Western set in the American South.',
 'Django Unchained (2012)'),

('film', 'hard', 'In Arrival, what is the name of the alien language that Louise Banks learns?',
 '["Heptapod B","Logogram","Alien Script","The Language of Time"]', 0,
 'The alien written language is called Heptapod B. Unlike human languages, it is non-linear — perceiving and writing it changes Louise''s perception of time, allowing her to experience non-sequential memories.',
 'Arrival (2016)'),

('film', 'medium', 'In The Revenant, what creature attacks and mauls Hugh Glass (Leonardo DiCaprio)?',
 '["A grizzly bear","A mountain lion","A wolf pack","A bison"]', 0,
 'Glass is brutally attacked by a mother grizzly bear protecting her cubs. The mauling sequence was filmed over 6 days and used animatronic bears alongside real footage.',
 'The Revenant (2015)'),

('film', 'easy', 'Marriage Story (2019) was directed by which filmmaker?',
 '["Noah Baumbach","Greta Gerwig","Todd Phillips","Sam Mendes"]', 0,
 'Noah Baumbach wrote and directed Marriage Story, which stars Adam Driver and Scarlett Johansson as a couple going through a bicoastal divorce.',
 'Marriage Story (2019)'),

('film', 'hard', 'In Hereditary, what is the name of the demon whose cult the family is connected to?',
 '["Paimon","Mammon","Baal","Leviathan"]', 0,
 'King Paimon is one of the eight kings of Hell in demonology. The grandmother Annie''s secret cult has been ritually preparing the Graham family to provide Paimon with a male host body.',
 'Hereditary (2018)'),

('film', 'medium', 'Dunkirk (2017) uses a non-linear structure with three timelines. What are the three settings?',
 '["The Mole (week), The Sea (day), The Air (hour)","Land, Sea, Air on the same day","Dunkirk, London, Berlin","1940, 1941, 1942"]', 0,
 'Nolan structures the film across three timelines: a week on the Mole (land), a day at sea, and one hour in the air — all converging at the evacuation''s climax.',
 'Dunkirk (2017)'),

('film', 'hard', 'In Taxi Driver, what song plays over the final shoot-out as Travis Bickle rescues Iris?',
 '["Bernard Herrmann''s orchestral score","Born to Run","Piano theme","Psycho strings"]', 0,
 'Bernard Herrmann''s original score — his final work before his death — plays over the shootout. Herrmann died the night he completed recording the Taxi Driver score.',
 'Taxi Driver (1976)'),

('film', 'medium', 'In 2001: A Space Odyssey, what does HAL 9000 say are his first memories?',
 '["Becoming operational at HAL plant in Urbana","Waking up aboard Discovery","Hearing Dave''s voice","Learning chess"]', 0,
 'HAL tells Dave he became operational at the HAL plant in Urbana, Illinois on January 12, 1992 — an eerily mundane origin for the film''s most chilling character.',
 '2001: A Space Odyssey (1968)'),

('film', 'hard', 'Which actress plays both Mia Wallace and Fabienne in Pulp Fiction?',
 '["Uma Thurman plays Mia; Maria de Medeiros plays Fabienne","Uma Thurman plays both","Maria de Medeiros plays both","Uma Thurman plays Mia; Rosanna Arquette plays Fabienne"]', 0,
 'Uma Thurman plays Mia Wallace (Vincent''s boss''s wife) while Maria de Medeiros plays Fabienne (Butch''s girlfriend). Both characters are central to their respective storylines.',
 'Pulp Fiction (1994)'),

('film', 'easy', 'In Forrest Gump, what does Forrest''s mother say "life is like"?',
 '["A box of chocolates","A journey","A river","A feather in the wind"]', 0,
 '"Life is like a box of chocolates — you never know what you''re gonna get." The line was voted one of AFI''s 100 greatest movie quotes.',
 'Forrest Gump (1994)'),

('film', 'medium', 'Whiplash (2014) was Damien Chazelle''s breakthrough. What instrument does the protagonist Andrew Neiman play?',
 '["Drums","Piano","Trumpet","Saxophone"]', 0,
 'Andrew Neiman is a drumming prodigy at the fictional Shaffer Conservatory. Chazelle based the story on his own experiences in a high-pressure jazz drumming program.',
 'Whiplash (2014)'),

('film', 'hard', 'What real-world composer''s music does Paul Thomas Anderson refuse to use in There Will Be Blood, instead commissioning Jonny Greenwood?',
 '["No specific composer — Greenwood was always the plan","He replaced Brahms","Greenwood replaced a temp track of classical pieces","He rejected Ennio Morricone"]', 2,
 'PTA cut Jonny Greenwood''s score to a rough cut temp-tracked with classical music, then had Greenwood write original music to replace it — building the famously dissonant, unsettling score.',
 'There Will Be Blood (2007)'),

('film', 'medium', 'In Parasite, the Kim family''s home is described by what architectural term?',
 '["Semi-basement (banjiha)","Basement","Sub-level","Underground"]', 0,
 'The Kim family lives in a banjiha — a Korean semi-basement apartment, partially below street level with windows at ground level. Bong uses the vertical geography of Seoul to represent class.',
 'Parasite (2019)'),

('film', 'easy', 'Who directed the film Dune (2021)?',
 '["Denis Villeneuve","Christopher Nolan","Ridley Scott","David Lynch"]', 0,
 'Denis Villeneuve directed Dune: Part One (2021) and Dune: Part Two (2024). David Lynch had previously directed a 1984 adaptation that Villeneuve sought to improve upon.',
 'Dune (2021)'),

('film', 'hard', 'In The Dark Knight, what bank does the Joker rob in the opening sequence?',
 '["Gotham National Bank","City Bank","First National Bank","Arkham Savings"]', 0,
 'The Joker robs Gotham National Bank in the spectacular opening heist, during which each robber is killed off by the others until only the Joker remains.',
 'The Dark Knight (2008)'),

('film', 'medium', 'In Inception, how many dream levels deep do Cobb and his team go?',
 '["4 levels (plus Limbo)","3 levels","5 levels","2 levels"]', 0,
 'The team goes four levels deep: Level 1 (van/city), Level 2 (hotel), Level 3 (snowy fortress), and Level 4 (Cobb''s Limbo). Fischer is extracted at Level 3; Cobb and Ariadne enter Limbo to retrieve Saito.',
 'Inception (2010)'),

('film', 'hard', 'In Requiem for a Dream, what TV show does Sara Goldfarb become obsessed with?',
 '["Tappy Tibbons'' Juice with Gems","The Price is Right","Wheel of Fortune","Jeopardy!"]', 0,
 'Sara becomes obsessed with a fictional infomercial/game show hosted by Tappy Tibbons, fantasising about appearing on it and losing weight to wear her red dress.',
 'Requiem for a Dream (2000)'),

('film', 'medium', 'In No Country for Old Men, what weapon does Anton Chigurh use as his preferred tool?',
 '["A captive bolt pistol","A shotgun","A knife","A silenced pistol"]', 0,
 'Chigurh uses a captive bolt pistol — a livestock stunner — as his signature weapon and to break door locks. He also carries a silenced shotgun for more conventional kills.',
 'No Country for Old Men (2007)'),

('film', 'easy', 'In The Lord of the Rings, what is the one ring''s inscription language called?',
 '["Black Speech of Mordor","Elvish","Dwarvish","Sindarin"]', 0,
 'The inscription is written in Black Speech, the language of Mordor created by Sauron. Gandalf reads it aloud in the Council of Elrond, causing Elrond to recoil.',
 'The Lord of the Rings: The Fellowship of the Ring (2001)'),

('film', 'hard', 'The cinematographer of Blade Runner 2049 also shot the original Blade Runner. Who is this cinematographer?',
 '["Roger Deakins shot 2049; Jordan Cronenweth shot the original","Both were shot by Roger Deakins","Jordan Cronenweth shot both","Vilmos Zsigmond shot both"]', 0,
 'Roger Deakins won his first Oscar for Blade Runner 2049''s cinematography. The original 1982 film was shot by Jordan Cronenweth — the two films are a remarkable pair across different cinematographers.',
 'Blade Runner 2049 (2017)'),

('film', 'medium', 'In Marriage Story, the dueling divorce lawyers are played by which two actors?',
 '["Laura Dern and Ray Liotta","Scarlett Johansson and Adam Driver","Merritt Wever and Julie Hagerty","Laura Dern and Alan Alda"]', 0,
 'Laura Dern plays the aggressive Nora Fanshaw (winning an Oscar for it) and Ray Liotta plays Jay Marotta, the combative lawyer Nicole hires when the divorce turns ugly. Alan Alda plays Bert Spitz.',
 'Marriage Story (2019)'),

('film', 'hard', 'Who composed the score for Oppenheimer (2023)?',
 '["Ludwig Göransson","Hans Zimmer","Jonny Greenwood","John Williams"]', 0,
 'Ludwig Göransson — who also scored Black Panther and Tenet — composed the Oppenheimer score. He recorded nuclear sounds by scraping a piano''s interior strings to create atomic tension.',
 'Oppenheimer (2023)'),

('film', 'medium', 'In Everything Everywhere All at Once, what happens to people who access other universe''s skills?',
 '["They must perform absurd actions (googly eyes, etc.)","They meditate","They go into a coma","They forget their own universe"]', 0,
 'To access verse-jumping powers, characters must perform increasingly absurd, improbable actions — like eating a whole chapstick or paper-cutting between their fingers — that their current-universe self would never do.',
 'Everything Everywhere All at Once (2022)'),

-- ─── TV (30) ─────────────────────────────────────────────────────────────────

('tv', 'medium', 'In Better Call Saul, what is Jimmy McGill''s legal alias before becoming Saul Goodman?',
 '["Slippin'' Jimmy","James M. McGill","Gene Takavic","Viktor St. Claire"]', 0,
 '"Slippin'' Jimmy" was his street-level con-artist nickname in Cicero, Illinois. The show reveals he took the Saul Goodman name professionally, and later becomes Gene Takavic in Omaha under Witness Protection.',
 'Better Call Saul (2015–2022)'),

('tv', 'hard', 'In The Bear, what does Carmy''s letter from the French Laundry say about his final day there?',
 '["He earned a recommendation but chose to leave","He was fired","He never worked there — it''s a lie he tells staff","He quit during service after a breakdown"]', 3,
 'Carmy left The Beef to Carmy and the staff discovered — through Sugar''s reading of letters — that his time at elite restaurants was marked by brutal perfectionism and a breakdown during service.',
 'The Bear (2022–)'),

('tv', 'easy', 'In Succession, who is the patriarch of the Roy family?',
 '["Logan Roy","Kendall Roy","Siobhan Roy","Connor Roy"]', 0,
 'Logan Roy (Brian Cox) is the patriarch and founder of Waystar Royco, the global media conglomerate. His three younger children spend the series competing to be his chosen successor.',
 'Succession (2018–2023)'),

('tv', 'medium', 'In Invincible, what is the name of the superhero team that Nolan Grayson (Omni-Man) belongs to on Earth?',
 '["Teen Team","Guardians of the Globe","Justice League","The Coalition"]', 1,
 'The Guardians of the Globe are Earth''s premier superhero team. Omni-Man massacres them at the end of episode one in one of animated TV''s most shocking moments.',
 'Invincible (2021–)'),

('tv', 'hard', 'In Avatar: The Last Airbender, what is the name of the ancient library where Team Avatar discovers the Day of Black Sun?',
 '["Wan Shi Tong''s Library","The Spirit Library","Zhao''s Archives","The Moon Spirit''s Repository"]', 0,
 'Wan Shi Tong ("He Who Knows Ten Thousand Things") is a Great Spirit who maintains an enormous underground library. He withdraws it into the Spirit World when he realizes humans are using his knowledge for war.',
 'Avatar: The Last Airbender (2005–2008)'),

('tv', 'medium', 'In Game of Thrones, what is the name of Jon Snow''s direwolf?',
 '["Ghost","Grey Wind","Nymeria","Lady"]', 0,
 'Ghost is Jon Snow''s albino direwolf. Unlike the other Stark direwolves, Ghost survives the entire series — he is given to the Free Folk north of the Wall in the finale.',
 'Game of Thrones (2011–2019)'),

('tv', 'hard', 'In Severance, what department does Mark S. work in at Lumon Industries?',
 '["Macrodata Refinement","Optics and Design","Tempe Outpost","Cold Harbor"]', 0,
 'Mark works in Macrodata Refinement (MDR), where severed employees sort mysterious numbers on screens without understanding their purpose. Their "innies" have no memories of the outside world.',
 'Severance (2022–)'),

('tv', 'easy', 'In Ted Lasso, what sport does AFC Richmond play?',
 '["Football (soccer)","American football","Rugby","Cricket"]', 0,
 'AFC Richmond is an English Premier League football (soccer) club. The premise is that Ted Lasso, an American college football coach, is hired to manage the club despite knowing nothing about soccer.',
 'Ted Lasso (2020–2023)'),

('tv', 'medium', 'The Mandalorian is set in what time period relative to the main Star Wars films?',
 '["After Return of the Jedi","Before A New Hope","During The Empire Strikes Back","After The Rise of Skywalker"]', 0,
 'The Mandalorian is set five years after the fall of the Empire (Return of the Jedi, 1983), in a period when the New Republic is new and the remnants of the Empire persist as criminal organizations.',
 'The Mandalorian (2019–)'),

('tv', 'hard', 'In Fleabag, what is Fleabag''s name? (the character''s actual name)',
 '["Never revealed","Fleabag","Phoebe","Emma"]', 0,
 'The protagonist''s real name is never revealed in the show — she is only ever credited and called "Fleabag." Creator Phoebe Waller-Bridge deliberately withheld it to reflect the character''s fragmented sense of self.',
 'Fleabag (2016–2019)'),

('tv', 'medium', 'In Westworld Season 1, who is revealed to be the author of the "Reveries" update that awakens the hosts?',
 '["Arnold / Bernard","Dr. Ford","Elsie","Dolores"]', 0,
 'Arnold (later recreated as Bernard Lowe) wrote the Reveries update — a maze-like process guiding hosts toward consciousness. Ford secretly inserted it as his final project before the narrative launch.',
 'Westworld (2016–2022)'),

('tv', 'hard', 'In Peaky Blinders, what is the name of Thomas Shelby''s powerful political nemesis who becomes Inspector General?',
 '["Chester Campbell","Luca Changretta","Oswald Mosley","Alfie Solomons"]', 0,
 'Chief Inspector Chester Campbell (Sam Neill) is Tommy''s original antagonist, sent by Winston Churchill to shut down the Peaky Blinders. He is killed in Season 2.',
 'Peaky Blinders (2013–2022)'),

('tv', 'medium', 'In Ozark, what cartel does Marty Byrde launder money for?',
 '["Omar Navarro''s Mexican cartel","The Kansas City mob","The Chicago Outfit","The Sinaloa Cartel"]', 0,
 'Marty launders money for Omar Navarro''s unnamed Mexican drug cartel. The whole series is premised on his desperate arrangement to avoid being killed after his partner stole from the cartel.',
 'Ozark (2017–2022)'),

('tv', 'easy', 'In The Boys, what is the name of the corporation that manages and monetizes the superheroes?',
 '["Vought International","Homelander Corp","Seven Industries","Super Corp"]', 0,
 'Vought International owns and manages The Seven and other supes. They position superheroes as public figures while concealing the sinister corporate control and compound V experiments behind them.',
 'The Boys (2019–)'),

('tv', 'hard', 'Mindhunter is based on the memoir of which FBI agent?',
 '["John Douglas","Robert Ressler","Ted Bundy","Roy Hazelwood"]', 0,
 'Mindhunter is based on the memoir "Mindhunter: Inside the FBI''s Elite Serial Crime Unit" by John Douglas and Mark Olshaker. Holden Ford is based on Douglas; Bill Tench is based on Robert Ressler.',
 'Mindhunter (2017–2019)'),

('tv', 'medium', 'Chernobyl (2019) is a miniseries produced by which two platforms?',
 '["HBO and Sky","Netflix and BBC","Amazon and HBO","Showtime and Channel 4"]', 0,
 'Chernobyl was co-produced by HBO and Sky and received universal critical acclaim. It won the Emmy for Outstanding Limited or Anthology Series and has a 9.4 on IMDb.',
 'Chernobyl (2019)'),

('tv', 'hard', 'In The Last of Us (TV), what fungal organism causes the infection?',
 '["Cordyceps","Ophiocordyceps","Zombie Ant Fungus","Candida auris"]', 0,
 'The show is based on a mutated Cordyceps fungus that adapts to infect humans — inspired by the real Ophiocordyceps unilateralis that controls ant behavior. The show''s fungal lore was praised for scientific plausibility.',
 'The Last of Us (2023–)'),

('tv', 'medium', 'In Mr. Robot, who is revealed to be Elliot''s alternate personality?',
 '["Mr. Robot (his father)","Tyrell Wellick","Whiterose","Darlene"]', 0,
 'Mr. Robot is revealed to be a dissociative identity based on Elliot''s father, Edward Alderson. Elliot manifests him as a subconscious coping mechanism and doesn''t know he is a different personality.',
 'Mr. Robot (2015–2019)'),

('tv', 'hard', 'In Atlanta, what is Earn''s cousin Paper Boi''s real name?',
 '["Alfred Miles","Brian Tyree Henry","Paper Miles","Darius Wright"]', 0,
 'Paper Boi''s real name is Alfred Miles. He is played by Brian Tyree Henry, who was nominated for an Emmy for the role.',
 'Atlanta (2016–2022)'),

('tv', 'medium', 'Shogun (2024) is set in which time period and country?',
 '["16th–17th century Japan","15th century China","18th century Korea","17th century India"]', 0,
 'Shogun is set in feudal Japan at the turn of the 17th century (c. 1600), during the period after Toyotomi Hideyoshi''s death as rival lords compete for power — mirroring real events around the Battle of Sekigahara.',
 'Shogun (2024)'),

('tv', 'hard', 'In True Detective Season 1, what does the phrase "The Yellow King" refer to?',
 '["A fictional supernatural entity from the Carcosa mythology the cult worships","The real murderer''s identity","A drug kingpin","A cult leader''s title"]', 0,
 'The Yellow King is drawn from Robert W. Chambers'' horror anthology "The King in Yellow" — used by the show''s cult as a supernatural focal point of their Carcosa rituals. Rust and Marty discover it is Errol Childress.',
 'True Detective (2014)'),

('tv', 'easy', 'Band of Brothers follows soldiers from which regiment of the United States Army?',
 '["101st Airborne Division, Easy Company","82nd Airborne","10th Mountain Division","1st Infantry Division"]', 0,
 'Band of Brothers follows Easy Company, 506th Parachute Infantry Regiment, 101st Airborne Division — from their training at Toccoa, through D-Day, to the end of the war in Europe.',
 'Band of Brothers (2001)'),

('tv', 'medium', 'In The White Lotus Season 1, which guest at the resort is killed by the end?',
 '["Greg (Jennifer Coolidge''s boyfriend) kills Armond","Armond is killed by Shane","Tanya''s death is foreshadowed","No one dies in Season 1"]', 1,
 'Shane (Jake Lacy) kills Armond (Murray Bartlett) by accidentally stabbing him during a break-in Shane set up, intending to file a complaint. The show opens with a body being loaded at the end of a vacation.',
 'The White Lotus (2021–)'),

('tv', 'hard', 'Barry (the HBO series) features Bill Hader as a hitman who wants to become an actor. In Season 1, what acting class does he join?',
 '["Gene Cousineau''s class in Los Angeles","The Groundlings","UCB Theatre","The Stella Adler Studio"]', 0,
 'Barry follows hitman Barry Berkman into Gene Cousineau''s (Henry Winkler) acting class in Los Angeles, where he discovers a passion for performance while trying to escape his criminal life.',
 'Barry (2018–2023)'),

('tv', 'medium', 'In Euphoria, what drug is Rue''s primary addiction?',
 '["Opioids/fentanyl","Cocaine","Alcohol","Methamphetamine"]', 0,
 'Rue (Zendaya) is addicted to opioids, including fentanyl. The show opens on the night of her return from rehab — it is unflinchingly honest about the mechanics of addiction and relapse.',
 'Euphoria (2019–)'),

('tv', 'hard', 'The Fargo TV series is an anthology. Which real Coen Brothers film does Season 4 most directly reference?',
 '["Miller''s Crossing","Fargo","No Country for Old Men","Blood Simple"]', 0,
 'Fargo Season 4 (set in 1950s Kansas City with Black and Italian mob families) draws thematically from Miller''s Crossing''s ethnic crime family warfare, more so than the original Fargo film.',
 'Fargo (2014–)'),

('tv', 'medium', 'In The Sopranos, what is the name of the restaurant Tony uses as a front business?',
 '["Satriale''s Pork Store","Bada Bing!","Vesuvio","Holsten''s"]', 0,
 'Satriale''s Pork Store is the New Jersey mob''s hangout and front business — the site of countless meetings, confrontations, and murders throughout the series.',
 'The Sopranos (1999–2007)'),

('tv', 'hard', 'In Breaking Bad, what is the chemical formula of the blue meth Walt and Jesse produce?',
 '["It is never explicitly stated — the blue color is from purity, not a formula difference","C10H15N (standard meth)","The blue comes from adding a cobalt compound","It uses a different precursor (P2P method)"]', 3,
 'Walt switches to the P2P (phenylacetone) method after the pseudoephedrine supply is cut. The iconic blue color is explained as a result of Walt''s precise synthesis leaving trace impurities that shift the color.',
 'Breaking Bad (2008–2013)'),

('tv', 'easy', 'In The Office (US), what is the name of Dunder Mifflin''s Scranton branch manager?',
 '["Michael Scott","Dwight Schrute","Jim Halpert","David Wallace"]', 0,
 'Michael Scott (Steve Carell) is the Regional Manager of Dunder Mifflin''s Scranton branch. He considers himself a great boss and a friend first — "a boss second, and probably an entertainer third."',
 'The Office (2005–2013)'),

('tv', 'medium', 'In Game of Thrones, who ultimately sits on the Iron Throne at the end of the series?',
 '["No one — the throne is melted by Drogon","Sansa Stark","Bran Stark","Jon Snow"]', 0,
 'Drogon melts the Iron Throne after Daenerys is killed by Jon Snow. Bran Stark is elected King of the Six Kingdoms, but the literal Iron Throne ceases to exist.',
 'Game of Thrones (2011–2019)'),

-- ─── BOOKS (20) ──────────────────────────────────────────────────────────────

('book', 'easy', 'In Project Hail Mary by Andy Weir, Ryland Grace wakes up on a spacecraft with no memory. What is his profession?',
 '["Middle school science teacher","Astronaut","Marine biologist","Chemist"]', 0,
 'Ryland Grace is a middle school science teacher who is the last survivor on the Hail Mary spacecraft. He was chosen because he discovered the key property of Astrophage — the organism threatening the Sun.',
 'Project Hail Mary (2021)'),

('book', 'hard', 'In Project Hail Mary, what does Rocky call the concept of music when he first encounters it?',
 '["Repeated organized sound","Rocky noise","Tonal art","Frequency dance"]', 0,
 'Rocky has no concept of music in Eridian culture and struggles to categorize it — he calls it "repeated organized sound" and eventually comes to appreciate it as an art form foreign to his species.',
 'Project Hail Mary (2021)'),

('book', 'easy', 'In The Hunger Games, what district is Katniss Everdeen from?',
 '["District 12","District 1","District 7","District 11"]', 0,
 'Katniss is from District 12, the coal-mining district in the Appalachian region — the poorest and most marginalized district in Panem.',
 'The Hunger Games (2008)'),

('book', 'medium', 'In The Hunger Games, what is the name of the flower that Katniss is named after?',
 '["Katniss (arrowhead plant)","Rue","Primrose","Nightlock"]', 0,
 'Katniss is named after the katniss plant (sagittaria), also known as arrowhead, which grows in the meadow near District 12. Her father told her she could survive as long as she could find herself.',
 'The Hunger Games (2008)'),

('book', 'hard', 'In Six of Crows by Leigh Bardugo, what is the name of the impenetrable prison the gang attempts to break into?',
 '["Ice Court","Fjerdan Prison","The Staple","Hellgate"]', 0,
 'The Ice Court of Fjerda is the most secure fortress in the Grisha world — the gang''s heist to break a scientist out of it drives the plot of the novel.',
 'Six of Crows (2015)'),

('book', 'medium', 'In Dune by Frank Herbert, what is the name of the desert people who are native to Arrakis?',
 '["Fremen","Sardaukar","Atreides","Harkonnen"]', 0,
 'The Fremen are the indigenous people of Arrakis who have adapted to the brutal desert environment. Their blue-within-blue eyes result from constant spice consumption, and their ecology is central to the novel''s themes.',
 'Dune (1965)'),

('book', 'hard', 'What is the name of the ecological transformation plan in Dune that the Fremen are secretly working toward?',
 '["Terraforming Arrakis into a paradise","The Bene Gesserit Missionaria Protectiva","The Golden Path","The Butlerian Jihad"]', 0,
 'The Fremen have been secretly following a 300-year plan by the ecologist Pardot Kynes to terraform Arrakis into a paradise. Paul recognizes this would destroy the sandworms and ultimately the spice.',
 'Dune (1965)'),

('book', 'easy', 'In Percy Jackson and the Olympians, which Greek god is Percy''s father?',
 '["Poseidon","Zeus","Ares","Apollo"]', 0,
 'Percy Jackson is the son of Poseidon, god of the sea. His parentage is a major secret for the first book because having a child with one of the Big Three violated a divine oath.',
 'The Lightning Thief (2005)'),

('book', 'medium', 'Agatha Christie''s most famous detective, Hercule Poirot, uses what method he calls the "little grey cells." What does this refer to?',
 '["His method of logical deduction and psychology","His use of forensic science","His network of informants","His photographic memory"]', 0,
 'Poirot''s "little grey cells" (les petites cellules grises) refers to his brain — specifically his method of logical deduction and psychological insight rather than physical evidence gathering.',
 'Agatha Christie Poirot stories'),

('book', 'hard', 'In And Then There Were None by Agatha Christie, how many guests are invited to Indian Island?',
 '["10","8","12","7"]', 0,
 'Ten guests are invited to Indian Island under false pretenses, corresponding to the "Ten Little Indians" (or "Soldiers") nursery rhyme. They are killed one by one in the order described in the rhyme.',
 'And Then There Were None (1939)'),

('book', 'medium', 'In Harry Potter, what does the spell "Avada Kedavra" do?',
 '["Kills the target instantly","Causes unbearable pain","Disarms the opponent","Transfigures the target"]', 0,
 'Avada Kedavra — the Killing Curse — causes instant death. It is one of the three Unforgivable Curses and is the curse Voldemort uses on Harry, which backfires due to Lily Potter''s sacrificial protection.',
 'Harry Potter series'),

('book', 'easy', 'In The Hitchhiker''s Guide to the Galaxy, what is the answer to life, the universe, and everything?',
 '["42","Yes","Unknown","Infinity"]', 0,
 'Deep Thought computes for 7.5 million years and determines the answer is 42. The problem is no one remembers the original question — prompting the construction of a new computer (Earth) to find it.',
 'The Hitchhiker''s Guide to the Galaxy (1979)'),

('book', 'hard', 'In Catch-22 by Joseph Heller, what is the central paradox of the "Catch-22" rule?',
 '["To be grounded for insanity you must request it, but requesting proves sanity","You can''t win the war but must keep fighting","Only officers can question orders but orders can''t be questioned","Sane people cause wars; insane people fight them"]', 0,
 'Catch-22 states: a pilot can be grounded for insanity, but must ask to be grounded; asking to be grounded is proof of sanity; therefore no pilot can ever be grounded for insanity.',
 'Catch-22 (1961)'),

('book', 'medium', 'In Brave New World by Aldous Huxley, what is the happiness drug that citizens take?',
 '["Soma","Prozium","Bliss","Rapture"]', 0,
 'Soma is the government-issued happiness drug taken by World State citizens. Huxley describes it as having "all the advantages of Christianity and alcohol; none of their defects."',
 'Brave New World (1932)'),

('book', 'hard', 'In Norwegian Wood by Haruki Murakami, what is the name of the psychiatric sanatorium where Naoko lives?',
 '["Ami Hostel (Ami-ryō)","Keio Hospital","The Midori Clinic","Green Valley"]', 0,
 'Naoko lives at Ami Hostel (Ami-ryō), a secluded therapeutic community in the mountains near Kyoto — a sanctuary for people who struggle to function in ordinary society.',
 'Norwegian Wood (1987)'),

('book', 'medium', 'The Name of the Wind by Patrick Rothfuss is the first book of which trilogy?',
 '["The Kingkiller Chronicle","The Stormlight Archive","The First Law","The Powder Mage Trilogy"]', 0,
 'The Name of the Wind is the first book in The Kingkiller Chronicle, narrating Kvothe''s life story. The second book is The Wise Man''s Fear; the third (The Doors of Stone) remains unpublished.',
 'The Name of the Wind (2007)'),

('book', 'hard', 'In The Road by Cormac McCarthy, what are the "good guys" carrying that differentiates them from the "bad guys"?',
 '["The fire","A gun with two bullets","A shopping cart","The boy''s innocence"]', 0,
 '"Carrying the fire" is the father''s metaphor for maintaining humanity and moral purpose in a post-apocalyptic world. He tells his son they are "carrying the fire" to distinguish them from those who have abandoned ethics.',
 'The Road (2006)'),

('book', 'easy', 'In The Alchemist by Paulo Coelho, what is the protagonist''s "Personal Legend"?',
 '["To travel to the Egyptian pyramids and find treasure","To become a shepherd","To find love","To learn alchemy"]', 0,
 'Santiago''s Personal Legend is to travel to the Egyptian pyramids in search of treasure. The journey is an allegory for pursuing one''s dreams — the treasure he ultimately finds is self-knowledge.',
 'The Alchemist (1988)'),

('book', 'hard', 'A Little Life by Hanya Yanagihara follows four friends from college. What is the mysterious traumatic past of the character Jude St. Francis?',
 '["Severe childhood abuse and exploitation by adults who were supposed to protect him","He witnessed a murder","He survived a house fire","He was wrongfully imprisoned"]', 0,
 'Jude''s past is slowly revealed as one of the most harrowing in contemporary fiction — childhood abuse by monks, exploitation by Brother William, and years of trafficking. The novel is praised for its unflinching portrayal of trauma.',
 'A Little Life (2015)'),

('book', 'medium', 'In Tomorrow, and Tomorrow, and Tomorrow by Gabrielle Zevin, what is the name of the first game Sam and Sadie create together?',
 '["Ichigo","Solution","Mapleworld","Counterpart"]', 0,
 'Ichigo is the first game Sam and Sadie create — a side-scrolling platform game inspired by Sadie''s game design thesis. Its success launches their studio, Unfair Games.',
 'Tomorrow, and Tomorrow, and Tomorrow (2022)');

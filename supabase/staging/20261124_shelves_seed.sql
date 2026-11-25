begin;
with raw as (
  select split_part(l,'|',1) k, split_part(l,'|',2) mid, split_part(l,'|',3) title, split_part(l,'|',4) p,
         split_part(l,'|',5)::int yr, nullif(split_part(l,'|',6),'') cr, split_part(l,'|',7)='1' b, o
  from regexp_split_to_table($d$f|tmdb-1439930|A Marvel Television Special Presentation - The Punisher: One Last Kill|w342/gOggsBCSypNXq0yApYeXe7nnopT.jpg|2026||0
f|tmdb-194662|Birdman or (The Unexpected Virtue of Ignorance)|w342/rHUg2AuIuLSIYMYFgavVwqt1jtc.jpg|2014|Alejandro G. Iñárritu|0
f|tmdb-1895|Star Wars: Episode III - Revenge of the Sith|w500/xfSAoBEm9MNBjmlNcDYLvLSMlnq.jpg|2005|George Lucas|0
f|291868|My Life Directed by Nicolas Winding Refn|w500/tH83eBJ10SrhJhOPnl4mv0ofp23.jpg|2015|Liv Corfixen|1
f|tmdb-428707|Kuroko's Basketball the Movie: Last Game|w342/mXJQbwxA0joNv9rGy25rFrm5N1r.jpg|2017|Shunsuke Tada|1
f|tmdb-799583|The Ministry of Ungentlemanly Warfare|w342/8aF0iAKH9MJMYAZdi0Slg77RYa2.jpg|2024|Guy Ritchie|1
f|tmdb-1228710|Star Wars: The Mandalorian and Grogu|w342/5Vi8dSauVwH1HOsiZceDMbRr1Ca.jpg|2026|Jon Favreau|1
f|686002|Black Holes: The Edge of All We Know|w500/b9q9K2OqagIIMd1JcmDo38cDFzK.jpg|2020|Peter Galison|1
f|tmdb-569094|Spider-Man: Across the Spider-Verse|w342/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg|2023|Justin K. Thompson|0
f|tmdb-89|Indiana Jones and the Last Crusade|w500/sizg1AU8f8JDZX4QIgE4pjUMBvx.jpg|1989|Steven Spielberg|1
f|tmdb-324857|Spider-Man: Into the Spider-Verse|w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg|2018|Bob Persichetti|0
f|tmdb-1333100|Attack on Titan: THE LAST ATTACK|w342/wgwldDDlTDDMrluOMkpSA8lyKjv.jpg|2024|Yuichiro Hayashi|1
f|tmdb-823464|Godzilla x Kong: The New Empire|w342/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg|2024|Adam Wingard|1
f|tmdb-101299|The Hunger Games: Catching Fire|w342/vrQHDXjVmbYzadOXQ0UaObunoy2.jpg|2013|Francis Lawrence|0
f|tmdb-373571|Godzilla: King of the Monsters|w342/mzOHg7Q5q9yUmY0b9Esu8Qe6Nnm.jpg|2019|Michael Dougherty|1
f|tmdb-1226863|The Super Mario Galaxy Movie|w500/eJGWx219ZcEMVQJhAgMiqo8tYY.jpg|2026|Michael Jelenic|1
f|1330021|Remarkably Bright Creatures|w500/9HcEqn3D4J6b2Z0jK54id9nA0fr.jpg|2026||0
f|13573|The United States of Leland|w500/60B0kXNSy3isCSZtM3vl2GWeKdE.jpg|2003|Matthew Ryan Hoge|0
f|tmdb-969681|Spider-Man: Brand New Day|w500/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg|2026|Destin Daniel Cretton|0
f|tmdb-429617|Spider-Man: Far From Home|w342/4q2NNj4S5dG2RLF9CpXsej7yXl.jpg|2019|Jon Watts|1
f|tmdb-102382|The Amazing Spider-Man 2|w342/bU7nTmvmy0h3VUP01v1T2imgH6N.jpg|2014|Marc Webb|0
f|tmdb-9799|The Fast and the Furious|w342/gqY0ITBgT7A82poL9jv851qdnIb.jpg|2001|Rob Cohen|0
f|1054867|One Battle After Another|w342/lbBWwxBht4JFP5PsuJ5onpMqugW.jpg|2025|Paul Thomas Anderson|0
f|tmdb-634649|Spider-Man: No Way Home|w342/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg|2021|Jon Watts|0
f|tmdb-99861|Avengers: Age of Ultron|w342/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg|2015|Joss Whedon|0
f|tmdb-1891|The Empire Strikes Back|w342/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg|1980|Irvin Kershner|0
f|tmdb-1930|The Amazing Spider-Man|w342/jexoNYnPd6vVrmygwF6QZmWPFdu.jpg|2012|Marc Webb|1
f|tmdb-315635|Spider-Man: Homecoming|w342/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg|2017|Jon Watts|1
f|tmdb-299536|Avengers: Infinity War|w342/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg|2018|Joe Russo|0
f|8393|The Gods Must Be Crazy|w500/wntGWN2mpeS3QaUm1PTKAcTM9K7.jpg|1980|Jamie Uys|0
f|tmdb-1101383|The End of Oak Street|w342/fYXqpgPmHMphSF2W30GbTeJVIa5.jpg|2026|David Robert Mitchell|0
f|tmdb-1281331|The Social Reckoning|w342/nZ8cQbjAQHRuSqwxvuYhOfxyhfW.jpg|2026|Aaron Sorkin|0
f|tmdb-2501|The Bourne Identity|w342/aP8swke3gmowbkfZ6lmNidu0y9p.jpg|2002|Doug Liman|0
f|tmdb-1381071|Godzilla Minus Zero|w342/hSmIJluOJmTWvJs4d7kHRxjc8s8.jpg|2026|Takashi Yamazaki|0
f|2898|As Good as It Gets|w500/xXxuJPNUDZ0vjsAXca0O5p3leVB.jpg|1997|James L. Brooks|0
f|tmdb-900667|One Piece Film Red|w342/8ibfhe4P7rhmn3lrPhOZzIJHA2B.jpg|2022|Goro Taniguchi|1
f|tmdb-940721|Godzilla Minus One|w342/2E2WTX0TJEflAged6kzErwqX1kt.jpg|2023|Takashi Yamazaki|1
f|1263337|Heart of the Beast|w500/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg|2026||1
f|the-social-network|The Social Network|w500/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg|2010|David Fincher|0
f|77987|Only God Forgives|w500/kWjjFSng1JttmDRwDROoGcIArEh.jpg|2013|Nicolas Winding Refn|0
f|blade-runner-2049|Blade Runner 2049|w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg|2017|Denis Villeneuve|1
f|tmdb-157354|Fruitvale Station|w342/oXSy3nEKFtfw5iRxdG8ouEFAnxs.jpg|2013|Ryan Coogler|1
f|tmdb-299534|Avengers: Endgame|w342/jtDv3lCnST0fZRvdYFwR5CVwK2x.jpg|2019|Anthony Russo|0
f|tmdb-4348|Pride & Prejudice|w342/o8UhmEbWPHmTUxP0lMuCoqNkbB3.jpg|2005|Joe Wright|0
f|tmdb-687163|Project Hail Mary|w342/yihdXomYb5kTeSivtFndMy5iDmf.jpg|2026|Phil Lord, Christopher Miller|0
f|tmdb-455207|Crazy Rich Asians|w342/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg|2018|Jon M. Chu|0
f|tmdb-693134|Dune: Part Two|w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg|2024|Denis Villeneuve|1
f|tmdb-290250|The Nice Guys|w500/clq4So9spa9cXk3MZy2iMdqkxP2.jpg|2016|Shane Black|0
f|tmdb-1317288|Marty Supreme|w500/lYWEXbQgRTR4ZQleSXAgRbxAjvq.jpg|2025|Josh Safdie|0
f|interstellar|Interstellar|w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg|2014|Christopher Nolan|0
f|tmdb-396535|Train to Busan|w342/vNVFt6dtcqnI7hqa6LFBUibuFiw.jpg|2016|Yeon Sang-ho|1
f|the-departed|The Departed|w500/nT97ifVT2J1yMQmeq20Qblg61T.jpg|2006|Martin Scorsese|1
f|tmdb-872585|Oppenheimer|w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg|2023|Christopher Nolan|1
f|tmdb-339403|Baby Driver|w342/tYzFuYXmT8LOYASlFCkaPiAFAl0.jpg|2017|Edgar Wright|0
f|tmdb-7459|Speed Racer|w342/fxRIpx9Op9h71q3tvuabx4GryyP.jpg|2008|The Wachowskis|1
f|tmdb-1368337|The Odyssey|w500/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg|2026|Christopher Nolan|1
f|tmdb-103|Taxi Driver|w342/ekstpH614fwDX8DUln1a2Opz0N8.jpg|1976|Martin Scorsese|1
f|fight-club|Fight Club|w500/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg|1999|David Fincher|0
f|the-batman|The Batman|w500/74xTEgt7R36Fpooo50r9T25onhq.jpg|2022|Matt Reeves|0
f|tmdb-82|Miami Vice|w342/iJPSls4taB09EUKtLj6FjFSprb3.jpg|2006|Michael Mann|0
f|tmdb-11969|Tombstone|w500/wGFCvylul8iEQhJOKfwZGGvXMzA.jpg|1993|George P. Cosmatos|0
f|midsommar|Midsommar|w500/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg|2019|Ari Aster|0
f|tmdb-763285|Ambulance|w342/hUbgg3mMSbY9PlpTxBo4IFUVSd6.jpg|2022|Michael Bay|0
f|whiplash|Whiplash|w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg|2014|Damien Chazelle|0
f|tmdb-562|Die Hard|w342/7Bjd8kfmDSOzpmhySpEhkUyK2oH.jpg|1988|John McTiernan|1
f|tmdb-111|Scarface|w342/iQ5ztdjvteGeboxtmRdXEChJOHh.jpg|1983|Brian De Palma|1
f|tmdb-744|Top Gun|w342/xUuHj3CgmZQ9P2cMaqQs4J0d4Zc.jpg|1986|Tony Scott|1
f|1078605|Weapons|w342/cpf7vsRZ0MYRQcnLWteD5jK9ymT.jpg|2025|Zach Cregger|0
f|arrival|Arrival|w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg|2016|Denis Villeneuve|1
f|babylon|Babylon|w500/wjOHjWCUE0YzDiEzKv8AfqHj3ir.jpg|2022|Damien Chazelle|0
f|sicario|Sicario|w500/lz8vNyXeidqqOdJW9ZjnDAMb5Vr.jpg|2015|Denis Villeneuve|0
f|tmdb-858024|Hamnet|w342/vbeyOZm2bvBXcbgPD3v6o94epPX.jpg|2025|Chloé Zhao|1
f|drive|Drive|w500/602vevIURmpDfzbnv5Ubi6wIkQm.jpg|2011|Nicolas Winding Refn|0
f|heat|Heat|w500/umSVjVdbVwtx5ryCA2QXL44Durm.jpg|1995|Michael Mann|0
f|8066|Stay|w500/nrLZVP8jG0KBcabahRPp6UP7Oy2.jpg|2005|Marc Forster|0
f|dune|Dune|w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg|2021|Denis Villeneuve|0
f|tmdb-546121|Run|w342/ilHG4EayOVoYeKqslspY3pR4wzC.jpg|2020|Aneesh Chaganty|0
t|tmdb-33623|The Avengers: Earth's Mightiest Heroes|w342/r1JDhMrqCOZKh7lc0vQlRYQ46cE.jpg|2010||0
t|tmdb-31911|Fullmetal Alchemist: Brotherhood|w342/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg|2009||1
t|tmdb-260463|Daemons of the Shadow Realm|w500/vIE1llfr1lcmzlsV4xn8vhgtlQN.jpg|2026||0
t|tmdb-3854|The Spectacular Spider-Man|w342/dCNxOhXT7c4lqYuRpdM3m8s9XDp.jpg|2008||1
t|tmdb-45790|JoJo's Bizarre Adventure|w342/ogAWwbh3frWtiTyyXrZaVFtqCgp.jpg|2012||0
t|tmdb-202555|Daredevil: Born Again|w500/xDUoAsU8lQHOOoRkFiBuarmACDN.jpg|2025||1
t|tmdb-65930|My Hero Academia|w342/phuYuzqWW9ru8EA3HVjE9W2Rr3M.jpg|2016||1
t|tmdb-60554|Star Wars Rebels|w342/eLrScs6Bs26JMcS8hiZhf7YRROr.jpg|2014||0
t|tmdb-1429|Attack on Titan|w342/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg|2013||1
t|breaking-bad|Breaking Bad|w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg|2008||1
t|tmdb-85271|WandaVision|w342/ijWWwINc8h71NQ8j1LTJMFSj5wr.jpg|2021||0
t|tmdb-93166|The Capture|w500/bCuTIRmnd6eBNZ9oBBQ2KAtErid.jpg|2019||0
t|invincible|Invincible|w500/yDWJYRAwMNKbIYT8ZB33qy84uzO.jpg|2021||0
t|succession|Succession|w500/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg|2018||0
t|tmdb-2316|The Office|w342/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg|2005||0
t|tmdb-37854|One Piece|w342/dB4EDhre2dsC2kxYDavyKWqLQwi.jpg|1999||0
t|tmdb-86031|Dr. STONE|w500/xfpSBNhBdQyrN3dTigqRVrOvSh1.jpg|2019||0
t|tmdb-1420|New Girl|w342/8oCqMlKKomCArVtyOjRzMN6g40Z.jpg|2011||1
t|tmdb-108978|Reacher|w342/f1VCQIG2iCyOookdgOzwtUpwWC0.jpg|2022||1
t|tmdb-125988|Silo|w342/gMYZZvnkVNTqSVnVCphWbPXwWwb.jpg|2023||0
b|the-secret-history|The Secret History|9781400031702|1992|Donna Tartt|0
b|dune-book|Dune|9780441172719|1965|Frank Herbert|1
b|the-alchemist|The Alchemist|9780062315007|1988|Paulo Coelho|1
b|never-let-me-go|Never Let Me Go|9781400078776|2005|Kazuo Ishiguro|0
b|the-remains-of-the-day|The Remains of the Day|9780679731726|1989|Kazuo Ishiguro|1
b|klara-and-the-sun|Klara and the Sun|9780593318171|2021|Kazuo Ishiguro|0
b|piranesi|Piranesi|9781635575637|2020|Susanna Clarke|1
b|the-road|The Road|9780307387899|2006|Cormac McCarthy|1
b|one-hundred-years-of-solitude|One Hundred Years of Solitude|9780060883287|1967|Gabriel García Márquez|1
b|oscar-wao|The Brief Wondrous Life of Oscar Wao|9781594483295|2007|Junot Díaz|1
b|hitchhikers-guide|The Hitchhiker's Guide to the Galaxy|9780345391803|1979|Douglas Adams|0
b|project-hail-mary-book|Project Hail Mary|9780593135204|2021|Andy Weir|0
b|tomorrow-and-tomorrow|Tomorrow, and Tomorrow, and Tomorrow|9780593321201|2022|Gabrielle Zevin|1
b|a-little-life|A Little Life|9780804172707|2015|Hanya Yanagihara|0
b|curious-incident|The Curious Incident of the Dog in the Night-Time|9781400032716|2003|Mark Haddon|0
b|geb|Gödel, Escher, Bach: An Eternal Golden Braid|9780465026562|1979|Douglas Hofstadter|1
b|sapiens|Sapiens: A Brief History of Humankind|9780062316097|2011|Yuval Noah Harari|1
b|evelyn-hugo|The Seven Husbands of Evelyn Hugo|9781501161933|2017|Taylor Jenkins Reid|0
b|station-eleven|Station Eleven|9780804172448|2014|Emily St. John Mandel|1
b|name-of-the-wind|The Name of the Wind|9780756404741|2007|Patrick Rothfuss|0
b|atomic-habits|Atomic Habits|9780735211292|2018|James Clear|1$d$, E'\n') with ordinality t(l,o)),
r as (select *, row_number() over (partition by k order by o) - 1 i,
  case k when 'f' then 'movie' when 't' then 'tv' else 'book' end mt,
  case k when 'b' then 'reading_shelf' else 'watchlist' end lt,
  case k when 'b' then 'https://covers.openlibrary.org/b/isbn/'||p||'-L.jpg?default=false' else 'https://image.tmdb.org/t/p/'||p end poster from raw),
rb as (select *, row_number() over (partition by k order by o) - 1 j from r where b)
insert into saved_items(user_id,list_type,media_id,media_type,title,poster,year,creator,added_at)
select '8e037823-d5a1-4f7a-b3af-63ea140e6953'::uuid,lt,mid,mt,title,poster,yr,cr,now()-make_interval(hours=>(i*9)::int) from r
union all
select '95c6e35b-2d25-419d-b9bc-84779ad01ba7'::uuid,lt,mid,mt,title,poster,yr,cr,now()-make_interval(hours=>(j*9+3)::int) from rb
on conflict do nothing;
insert into shelf_settings(user_id,film_visibility,tv_visibility,reading_visibility) values ('8e037823-d5a1-4f7a-b3af-63ea140e6953','public','unlisted','private'),('95c6e35b-2d25-419d-b9bc-84779ad01ba7','public','private','public') on conflict (user_id) do update set film_visibility=excluded.film_visibility,tv_visibility=excluded.tv_visibility,reading_visibility=excluded.reading_visibility;
insert into user_lists(id,user_id,title,description,is_public,is_ranked,visibility) values ('5e1f0000-0000-4000-8000-00000000a001','8e037823-d5a1-4f7a-b3af-63ea140e6953','Desert-island canon','Ten things I would take, in order. Films, shows and books mixed.',true,true,'public') on conflict (id) do nothing;
insert into user_list_items(list_id,media_type,media_id,title,poster_url,year,rank_order,notes,author) values
('5e1f0000-0000-4000-8000-00000000a001','movie','tmdb-194662','Birdman or (The Unexpected Virtue of Ignorance)','https://image.tmdb.org/t/p/w342/rHUg2AuIuLSIYMYFgavVwqt1jtc.jpg','2014',1,'The single-take illusion still feels like a magic trick.',null),
('5e1f0000-0000-4000-8000-00000000a001','book','the-secret-history','The Secret History','https://covers.openlibrary.org/b/isbn/9781400031702-L.jpg?default=false','1992',2,'Re-read every autumn.','Donna Tartt'),
('5e1f0000-0000-4000-8000-00000000a001','tv','tmdb-31911','Fullmetal Alchemist: Brotherhood','https://image.tmdb.org/t/p/w342/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg','2009',3,'Best ending of any long-running show.',null),
('5e1f0000-0000-4000-8000-00000000a001','movie','heat','Heat','https://image.tmdb.org/t/p/w500/umSVjVdbVwtx5ryCA2QXL44Durm.jpg','1995',4,'The diner scene.',null),
('5e1f0000-0000-4000-8000-00000000a001','book','curious-incident','The Curious Incident of the Dog in the Night-Time','https://covers.openlibrary.org/b/isbn/9781400032716-L.jpg?default=false','2003',5,null,'Mark Haddon'),
('5e1f0000-0000-4000-8000-00000000a001','movie','tmdb-569094','Spider-Man: Across the Spider-Verse','https://image.tmdb.org/t/p/w342/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg','2023',6,'Every frame is a poster.',null),
('5e1f0000-0000-4000-8000-00000000a001','tv','succession','Succession','https://image.tmdb.org/t/p/w500/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg','2018',7,null,null),
('5e1f0000-0000-4000-8000-00000000a001','movie','tmdb-1895','Star Wars: Episode III - Revenge of the Sith','https://image.tmdb.org/t/p/w500/xfSAoBEm9MNBjmlNcDYLvLSMlnq.jpg','2005',8,'Unironically.',null),
('5e1f0000-0000-4000-8000-00000000a001','book','geb','Gödel, Escher, Bach: An Eternal Golden Braid','https://covers.openlibrary.org/b/isbn/9780465026562-L.jpg?default=false','1979',9,'Still not finished. Never will be.','Douglas Hofstadter'),
('5e1f0000-0000-4000-8000-00000000a001','movie','interstellar','Interstellar','https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg','2014',10,null,null),
('5e1f0000-0000-4000-8000-00000000a001','tv','breaking-bad','Breaking Bad','https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg','2008',11,null,null),
('5e1f0000-0000-4000-8000-00000000a001','movie','whiplash','Whiplash','https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg','2014',12,'Not quite my tempo.',null);
insert into user_lists(id,user_id,title,description,is_public,is_ranked,visibility) values ('5e1f0000-0000-4000-8000-00000000a002','8e037823-d5a1-4f7a-b3af-63ea140e6953','Comfort rewatches',null,false,false,'private') on conflict (id) do nothing;
insert into user_list_items(list_id,media_type,media_id,title,poster_url,year,rank_order,notes,author) values
('5e1f0000-0000-4000-8000-00000000a002','movie','tmdb-290250','The Nice Guys','https://image.tmdb.org/t/p/w500/clq4So9spa9cXk3MZy2iMdqkxP2.jpg','2016',1,null,null),
('5e1f0000-0000-4000-8000-00000000a002','movie','tmdb-339403','Baby Driver','https://image.tmdb.org/t/p/w342/tYzFuYXmT8LOYASlFCkaPiAFAl0.jpg','2017',2,null,null),
('5e1f0000-0000-4000-8000-00000000a002','tv','tmdb-2316','The Office','https://image.tmdb.org/t/p/w342/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg','2005',3,null,null),
('5e1f0000-0000-4000-8000-00000000a002','tv','tmdb-1420','New Girl','https://image.tmdb.org/t/p/w342/8oCqMlKKomCArVtyOjRzMN6g40Z.jpg','2011',4,null,null),
('5e1f0000-0000-4000-8000-00000000a002','movie','tmdb-455207','Crazy Rich Asians','https://image.tmdb.org/t/p/w342/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg','2018',5,null,null),
('5e1f0000-0000-4000-8000-00000000a002','movie','tmdb-744','Top Gun','https://image.tmdb.org/t/p/w342/xUuHj3CgmZQ9P2cMaqQs4J0d4Zc.jpg','1986',6,null,null);
insert into user_lists(id,user_id,title,description,is_public,is_ranked,visibility) values ('5e1f0000-0000-4000-8000-00000000b001','95c6e35b-2d25-419d-b9bc-84779ad01ba7','Every Godzilla, ranked','Monster cinema, best to worst.',true,true,'public') on conflict (id) do nothing;
insert into user_list_items(list_id,media_type,media_id,title,poster_url,year,rank_order,notes,author) values
('5e1f0000-0000-4000-8000-00000000b001','movie','tmdb-940721','Godzilla Minus One','https://image.tmdb.org/t/p/w342/2E2WTX0TJEflAged6kzErwqX1kt.jpg','2023',1,'The bar.',null),
('5e1f0000-0000-4000-8000-00000000b001','movie','tmdb-1381071','Godzilla Minus Zero','https://image.tmdb.org/t/p/w342/hSmIJluOJmTWvJs4d7kHRxjc8s8.jpg','2026',2,null,null),
('5e1f0000-0000-4000-8000-00000000b001','movie','tmdb-373571','Godzilla: King of the Monsters','https://image.tmdb.org/t/p/w342/mzOHg7Q5q9yUmY0b9Esu8Qe6Nnm.jpg','2019',3,'Bear McCreary carries it.',null),
('5e1f0000-0000-4000-8000-00000000b001','movie','tmdb-823464','Godzilla x Kong: The New Empire','https://image.tmdb.org/t/p/w342/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg','2024',4,'Pure toy box.',null);
insert into user_lists(id,user_id,title,description,is_public,is_ranked,visibility) values ('5e1f0000-0000-4000-8000-00000000b002','95c6e35b-2d25-419d-b9bc-84779ad01ba7','Secret Santa ideas for the group chat','Shared by link only.',false,false,'unlisted') on conflict (id) do nothing;
insert into user_list_items(list_id,media_type,media_id,title,poster_url,year,rank_order,notes,author) values
('5e1f0000-0000-4000-8000-00000000b002','book','piranesi','Piranesi','https://covers.openlibrary.org/b/isbn/9781635575637-L.jpg?default=false','2020',1,null,'Susanna Clarke'),
('5e1f0000-0000-4000-8000-00000000b002','book','project-hail-mary-book','Project Hail Mary','https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg?default=false','2021',2,null,'Andy Weir'),
('5e1f0000-0000-4000-8000-00000000b002','movie','8393','The Gods Must Be Crazy','https://image.tmdb.org/t/p/w500/wntGWN2mpeS3QaUm1PTKAcTM9K7.jpg','1980',3,null,null),
('5e1f0000-0000-4000-8000-00000000b002','tv','tmdb-125988','Silo','https://image.tmdb.org/t/p/w342/gMYZZvnkVNTqSVnVCphWbPXwWwb.jpg','2023',4,null,null);
insert into user_lists(id,user_id,title,description,is_public,is_ranked,visibility) values ('5e1f0000-0000-4000-8000-00000000b003','95c6e35b-2d25-419d-b9bc-84779ad01ba7','Private: maybe drop',null,false,false,'private') on conflict (id) do nothing;
insert into user_list_items(list_id,media_type,media_id,title,poster_url,year,rank_order,notes,author) values
('5e1f0000-0000-4000-8000-00000000b003','movie','8066','Stay','https://image.tmdb.org/t/p/w500/nrLZVP8jG0KBcabahRPp6UP7Oy2.jpg','2005',1,null,null),
('5e1f0000-0000-4000-8000-00000000b003','movie','tmdb-546121','Run','https://image.tmdb.org/t/p/w342/ilHG4EayOVoYeKqslspY3pR4wzC.jpg','2020',2,null,null);
commit;

-- Books that aren't in the local catalogue are stored by Open Library work id (as the app does).
begin;
update saved_items set media_id='OL59038W', poster='https://covers.openlibrary.org/b/id/1047334-L.jpg' where media_type='book' and media_id='never-let-me-go';
update user_list_items set media_id='OL59038W', poster_url='https://covers.openlibrary.org/b/id/1047334-L.jpg' where media_type='book' and media_id='never-let-me-go';
update saved_items set media_id='OL59048W', poster='https://covers.openlibrary.org/b/id/95742-L.jpg' where media_type='book' and media_id='the-remains-of-the-day';
update user_list_items set media_id='OL59048W', poster_url='https://covers.openlibrary.org/b/id/95742-L.jpg' where media_type='book' and media_id='the-remains-of-the-day';
update saved_items set media_id='OL20883297W', poster='https://covers.openlibrary.org/b/id/10648686-L.jpg' where media_type='book' and media_id='klara-and-the-sun';
update user_list_items set media_id='OL20883297W', poster_url='https://covers.openlibrary.org/b/id/10648686-L.jpg' where media_type='book' and media_id='klara-and-the-sun';
update saved_items set media_id='OL20893680W', poster='https://covers.openlibrary.org/b/id/10226290-L.jpg' where media_type='book' and media_id='piranesi';
update user_list_items set media_id='OL20893680W', poster_url='https://covers.openlibrary.org/b/id/10226290-L.jpg' where media_type='book' and media_id='piranesi';
update saved_items set media_id='OL40873W', poster='https://covers.openlibrary.org/b/id/198120-L.jpg' where media_type='book' and media_id='the-road';
update user_list_items set media_id='OL40873W', poster_url='https://covers.openlibrary.org/b/id/198120-L.jpg' where media_type='book' and media_id='the-road';
update saved_items set media_id='OL43108828W', poster='https://covers.openlibrary.org/b/id/15185412-L.jpg' where media_type='book' and media_id='one-hundred-years-of-solitude';
update user_list_items set media_id='OL43108828W', poster_url='https://covers.openlibrary.org/b/id/15185412-L.jpg' where media_type='book' and media_id='one-hundred-years-of-solitude';
update saved_items set media_id='OL7990014W', poster='https://covers.openlibrary.org/b/id/12451659-L.jpg' where media_type='book' and media_id='oscar-wao';
update user_list_items set media_id='OL7990014W', poster_url='https://covers.openlibrary.org/b/id/12451659-L.jpg' where media_type='book' and media_id='oscar-wao';
update saved_items set media_id='OL2163649W', poster='https://covers.openlibrary.org/b/id/12986869-L.jpg' where media_type='book' and media_id='hitchhikers-guide';
update user_list_items set media_id='OL2163649W', poster_url='https://covers.openlibrary.org/b/id/12986869-L.jpg' where media_type='book' and media_id='hitchhikers-guide';
update saved_items set media_id='OL21745884W', poster='https://covers.openlibrary.org/b/id/11200092-L.jpg' where media_type='book' and media_id='project-hail-mary-book';
update user_list_items set media_id='OL21745884W', poster_url='https://covers.openlibrary.org/b/id/11200092-L.jpg' where media_type='book' and media_id='project-hail-mary-book';
update saved_items set media_id='OL26004554W', poster='https://covers.openlibrary.org/b/id/12859975-L.jpg' where media_type='book' and media_id='tomorrow-and-tomorrow';
update user_list_items set media_id='OL26004554W', poster_url='https://covers.openlibrary.org/b/id/12859975-L.jpg' where media_type='book' and media_id='tomorrow-and-tomorrow';
update saved_items set media_id='OL2965102W', poster='https://covers.openlibrary.org/b/id/7890719-L.jpg' where media_type='book' and media_id='curious-incident';
update user_list_items set media_id='OL2965102W', poster_url='https://covers.openlibrary.org/b/id/7890719-L.jpg' where media_type='book' and media_id='curious-incident';
update saved_items set media_id='OL716850W', poster='https://covers.openlibrary.org/b/id/14368453-L.jpg' where media_type='book' and media_id='geb';
update user_list_items set media_id='OL716850W', poster_url='https://covers.openlibrary.org/b/id/14368453-L.jpg' where media_type='book' and media_id='geb';
update saved_items set media_id='OL17075811W', poster='https://covers.openlibrary.org/b/id/8634250-L.jpg' where media_type='book' and media_id='sapiens';
update user_list_items set media_id='OL17075811W', poster_url='https://covers.openlibrary.org/b/id/8634250-L.jpg' where media_type='book' and media_id='sapiens';
update saved_items set media_id='OL18203673W', poster='https://covers.openlibrary.org/b/id/8354226-L.jpg' where media_type='book' and media_id='evelyn-hugo';
update user_list_items set media_id='OL18203673W', poster_url='https://covers.openlibrary.org/b/id/8354226-L.jpg' where media_type='book' and media_id='evelyn-hugo';
update saved_items set media_id='OL17202418W', poster='https://covers.openlibrary.org/b/id/7369961-L.jpg' where media_type='book' and media_id='station-eleven';
update user_list_items set media_id='OL17202418W', poster_url='https://covers.openlibrary.org/b/id/7369961-L.jpg' where media_type='book' and media_id='station-eleven';
update saved_items set media_id='OL8479867W', poster='https://covers.openlibrary.org/b/id/11480483-L.jpg' where media_type='book' and media_id='name-of-the-wind';
update user_list_items set media_id='OL8479867W', poster_url='https://covers.openlibrary.org/b/id/11480483-L.jpg' where media_type='book' and media_id='name-of-the-wind';
commit;

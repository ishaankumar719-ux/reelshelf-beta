export type EasterEgg =
  | 'starfield'
  | 'spice'
  | 'codeRain'
  | 'heroic'
  | 'shield'
  | 'stormforge'
  | 'cosmicRelics'
  | 'web'
  | 'vigilante'
  | 'wizardry'
  | 'middleEarth'
  | 'prehistoric'
  | 'hyperspace'
  | 'babylon'
  | 'cinephile'
  | 'otherworld'
  | 'dynasty'
  | 'outlaw'
  | 'aftermath'
  | 'kitchenHeat';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Deliberately small and hand-picked: these are visual nods for landmark
// titles, not an attempt to assign an effect to every title automatically.
export function getEasterEgg(id: string, title: string, mediaType: 'film' | 'tv' | 'book' = 'film'): EasterEgg | null {
  const key = normalize(title);

  if (mediaType === 'tv') {
    // Cult television gets the same world-building treatment as film, grouped
    // by show universe so companion series always reveal a consistent moment.
    if ([
      'strangerthings', 'twinpeaks', 'dark', 'lost', 'severance', 'blackmirror',
      'mrrobot', 'yellowjackets',
    ].some((match) => key.startsWith(match))) return 'otherworld';
    if (key.startsWith('gameofthrones') || key.startsWith('houseofthedragon') || key.startsWith('thelordoftherings')) return 'dynasty';
    if (key.startsWith('breakingbad') || key.startsWith('bettercallsaul')) return 'outlaw';
    if ([
      'thelastofus', 'thewalkingdead', 'fallout', 'thehandmaidstale', 'chernobyl',
    ].some((match) => key.startsWith(match))) return 'aftermath';
    if (key.startsWith('starwars') || key.startsWith('andor') || key.startsWith('themandalorian') || key.startsWith('ahsoka')) return 'hyperspace';
    if (key.startsWith('daredevil') || key.startsWith('loki') || key.startsWith('wandavision') || key.startsWith('theboys') || key.startsWith('invincible') || key.startsWith('arcane')) return 'heroic';
    if (key.startsWith('thebear')) return 'kitchenHeat';
    if ([
      'thesopranos', 'thewire', 'madmen', 'succession', 'peakyblinders',
      'dexter', 'theoffice', 'friends', 'seinfeld', 'fleabag',
    ].some((match) => key.startsWith(match))) return 'cinephile';
    return null;
  }

  if (mediaType === 'book') {
    // Books follow the same curated-world approach: familiar fan universes and
    // cult staples earn a scene, while the rest of the catalogue stays quiet.
    if (key.startsWith('harrypotter') || key.startsWith('fantasticbeasts')) return 'wizardry';
    if ([
      'thelordoftherings', 'thehobbit', 'thesilmarillion', 'thewheel of time',
    ].map(normalize).some((match) => key.startsWith(match))) return 'middleEarth';
    if (key.startsWith('dune')) return 'spice';
    if ([
      'agameofthrones', 'aclashofkings', 'astormofswords', 'afeastforcrows',
      'adancewithdragons', 'fourthwing', 'ironflame', 'onyxstorm', 'throneofglass',
      'acourtofthornsandroses', 'mistborn',
    ].map(normalize).some((match) => key.startsWith(match))) return 'dynasty';
    if ([
      'percyjackson', 'thelightningthief', 'theheroesofolympus',
    ].map(normalize).some((match) => key.startsWith(match))) return 'stormforge';
    if (key === 'it') return 'otherworld';
    if ([
      'twilight', 'newmoon', 'eclipse', 'breakingdawn', 'thevampirediaries',
      'theshining', 'carrie', 'coraline',
    ].map(normalize).some((match) => key.startsWith(match))) return 'otherworld';
    if ([
      'thehungergames', 'catchingfire', 'mockingjay', 'divergent', 'themazerunner',
      'thehandmaidstale', '1984',
    ].map(normalize).some((match) => key.startsWith(match))) return 'aftermath';
    if ([
      'thesongofachilles', 'circe', 'thenightcircus', 'theinvisiblelifeofaddielarue',
      'thegreatgatsby', 'thepictureofdoriangray', 'thebelljar',
    ].map(normalize).some((match) => key.startsWith(match))) return 'cinephile';
    return null;
  }

  if (mediaType !== 'film') return null;
  if (id === 'film-157336' || key === 'interstellar') return 'starfield';
  if (id === 'film-438631' || id === 'film-693134' || key.startsWith('dune')) return 'spice';
  if (id === 'film-603' || key === 'thematrix') return 'codeRain';
  if (key.startsWith('captainamerica')) return 'shield';
  if (key.startsWith('thor')) return 'stormforge';
  if (key === 'avengersendgame' || key === 'avengersinfinitywar') return 'cosmicRelics';
  // Cover the whole Spider-Man catalogue, including "The Amazing Spider-Man"
  // and the Spider-Verse films, so the discovery stays consistent for fans.
  if (key.includes('spiderman') || key.includes('spiderverse')) return 'web';
  if (key === 'babylon') return 'babylon';
  if (key.startsWith('harrypotter') || key.startsWith('fantasticbeasts')) return 'wizardry';
  if (key.startsWith('thelordoftherings') || key.startsWith('thehobbit')) return 'middleEarth';
  if (key.startsWith('jurassicpark') || key.startsWith('jurassicworld')) return 'prehistoric';
  if ([
    'avengers', 'avengersendgame', 'avengersinfinitywar', 'ironman', 'blackpanther',
    'captainamerica', 'guardiansofthegalaxy', 'deadpool', 'logan',
  ].some((match) => key.startsWith(match))) return 'heroic';
  // Every Batman story earns the bat-signal rather than only selected films.
  if (key.includes('batman') || key.includes('darkknight')) return 'vigilante';
  if ([
    'joker', 'manofsteel', 'wonderwoman', 'justiceleague', 'thesuicidesquad',
  ].some((match) => key.startsWith(match))) return 'vigilante';
  if ([
    'starwars', 'blade runner', 'alien', 'arrival', 'themartian', '2001aspaceodyssey',
  ].some((match) => key.startsWith(match.replace(/[^a-z0-9]+/g, '')))) return 'hyperspace';
  if ([
    'thegodfather', 'pulpfiction', 'goodfellas', 'taxidriver', 'whiplash', 'lalaland',
    'parasite', 'fightclub', 'therewillbeblood', 'nocountryforoldmen', 'seven',
  ].some((match) => key.startsWith(match))) return 'cinephile';
  return null;
}

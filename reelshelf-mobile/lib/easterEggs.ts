export type EasterEgg = 'starfield' | 'spice' | 'codeRain';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Deliberately small and hand-picked: these are visual nods for landmark
// titles, not an attempt to assign an effect to every title automatically.
export function getEasterEgg(id: string, title: string): EasterEgg | null {
  const key = normalize(title);
  if (id === 'film-157336' || key === 'interstellar') return 'starfield';
  if (id === 'film-438631' || id === 'film-693134' || key.startsWith('dune')) return 'spice';
  if (id === 'film-603' || key === 'thematrix') return 'codeRain';
  return null;
}

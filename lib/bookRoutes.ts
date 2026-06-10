import { getLocalBookByRouteId } from "./localBooks";

export function getBookHrefFromRouteId(id: string) {
  return `/books/${id}`;
}

export function isOpenLibraryId(id: string): boolean {
  return /^OL\d+W$/.test(id);
}

// Accepts any supported format and returns the canonical bare ID:
//   - local book slugs           → local book id
//   - "OL123W"                   → "OL123W"
//   - "ol-OL123W" (legacy)       → "OL123W"
//   - "/works/OL123W" (legacy)   → "OL123W"
//   - unknown                    → null
export function normalizeBookRouteId(id: string): string | null {
  let clean = id;

  if (clean.startsWith("ol-")) {
    clean = clean.slice(3);
  }

  if (clean.startsWith("/works/")) {
    clean = clean.slice(7);
  }

  if (isOpenLibraryId(clean)) {
    return clean;
  }

  const localBook = getLocalBookByRouteId(clean);
  return localBook ? localBook.id : null;
}

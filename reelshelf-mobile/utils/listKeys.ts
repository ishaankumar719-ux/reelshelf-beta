// ONE shared key-generation utility for every FlatList/.map() in this app.
//
// The "Encountered two children with the same key" warning recurred twice
// after two prior ad-hoc, per-file patches (Search screen, Profile screen)
// because each fix only touched the list it was looking at — every other
// list in the app kept constructing its own inline key string, so the same
// class of bug (keying by title alone, by a bare id shared across mixed
// media types, or by array index alone) kept reappearing elsewhere. This
// file is the single source of truth going forward — no list anywhere in
// this app should build its own ad-hoc key string; import from here instead.
export function getMediaKey(mediaType: string, id: string | number): string {
  return `${mediaType}-${id}`;
}

export function getActivityKey(
  activityType: string,
  mediaType: string | null | undefined,
  mediaId: string | number | null | undefined,
  createdAt: string,
  index: number,
): string {
  return `${activityType}-${mediaType ?? 'x'}-${mediaId ?? 'x'}-${createdAt}-${index}`;
}

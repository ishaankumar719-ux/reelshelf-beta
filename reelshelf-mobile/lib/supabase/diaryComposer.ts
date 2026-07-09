// Data layer for the Universal Review Composer — fetch-latest-entry-and-
// update, never insert-a-new-row-per-save (diary_entries is a log; a new row
// is only appropriate for a genuine new rewatch/reread entry, an explicit
// future feature, not built here). Reuses DIARY_SCOPE_DEFAULTS so Rate,
// Watched, and this composer all target the exact same row.
import { supabase } from './client';
import { DIARY_SCOPE_DEFAULTS, toDbMediaId, toDbMediaType } from './mediaActions';
import type { MediaType } from '@/data/seedHomeContent';

export type ReviewScope = 'title' | 'show' | 'season' | 'episode';
export type AttachmentType = 'image' | 'gif' | 'link';

export interface DiaryScopeKey {
  mediaId:       string;   // route id, e.g. "film-693134"
  mediaType:     MediaType;
  /** Defaults to DIARY_SCOPE_DEFAULTS (title-level) — season/episode scoping
   *  is supported by this data layer for a future episode-detail screen, but
   *  no such screen exists yet in this app (see RETURN's SURFACES_WIRED). */
  reviewScope?:  ReviewScope;
  showId?:       string;
  seasonNumber?: number;
  episodeNumber?: number;
}

function resolveScope(key: DiaryScopeKey) {
  return {
    review_scope:   key.reviewScope ?? DIARY_SCOPE_DEFAULTS.review_scope,
    show_id:        key.showId ?? DIARY_SCOPE_DEFAULTS.show_id,
    season_number:  key.seasonNumber ?? DIARY_SCOPE_DEFAULTS.season_number,
    episode_number: key.episodeNumber ?? DIARY_SCOPE_DEFAULTS.episode_number,
  };
}

export interface DiaryEntryFull {
  rating:                 number | null;
  review:                 string;
  watchedDate:            string;   // yyyy-mm-dd
  favourite:               boolean;
  rewatch:                 boolean;
  containsSpoilers:        boolean;
  watchedInCinema:         boolean;
  watchedLive:             boolean;
  bingeWatched:            boolean;
  reread:                  boolean;
  physicalBook:            boolean;
  ebook:                   boolean;
  audiobook:               boolean;
  attachmentUrl:           string | null;
  attachmentType:          AttachmentType | null;
  // Movie/TV layers (existing columns)
  scoreRating:             number | null;
  cinematographyRating:    number | null;
  writingRating:           number | null;
  performancesRating:      number | null;
  directionRating:         number | null;
  rewatchabilityRating:    number | null;
  emotionalImpactRating:   number | null;
  entertainmentRating:     number | null;
  // Book layers (new columns) — Writing/Emotional Impact reuse the columns above, not duplicated.
  layerCharacters:         number | null;
  layerPlot:               number | null;
  layerPacing:             number | null;
  layerWorldbuilding:      number | null;
  layerThemes:             number | null;
  layerRereadability:      number | null;
}

export function emptyDiaryEntry(): DiaryEntryFull {
  return {
    rating: null, review: '', watchedDate: new Date().toISOString().slice(0, 10),
    favourite: false, rewatch: false, containsSpoilers: false, watchedInCinema: false,
    watchedLive: false, bingeWatched: false, reread: false,
    physicalBook: false, ebook: false, audiobook: false,
    attachmentUrl: null, attachmentType: null,
    scoreRating: null, cinematographyRating: null, writingRating: null, performancesRating: null,
    directionRating: null, rewatchabilityRating: null, emotionalImpactRating: null, entertainmentRating: null,
    layerCharacters: null, layerPlot: null, layerPacing: null, layerWorldbuilding: null,
    layerThemes: null, layerRereadability: null,
  };
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'number' ? v : Number(v);
}

const DIARY_ROW_SELECT = `rating, review, watched_date, favourite, rewatch, contains_spoilers,
  watched_in_cinema, watched_live, binge_watched, reread, physical_book, ebook, audiobook,
  attachment_url, attachment_type, score_rating, cinematography_rating, writing_rating,
  performances_rating, direction_rating, rewatchability_rating, emotional_impact_rating,
  entertainment_rating, layer_characters, layer_plot, layer_pacing, layer_worldbuilding,
  layer_themes, layer_rereadability`;

/** Fetches the user's most recent diary_entries row for this exact
 *  (user, media, scope) — used to pre-fill the composer when a title has
 *  already been logged. Returns a fresh empty entry when none exists yet
 *  (this IS the "new entry" case, not an error). */
export async function fetchLatestDiaryEntry(userId: string, key: DiaryScopeKey): Promise<DiaryEntryFull> {
  const client = requireClient();
  const scope = resolveScope(key);
  const { data, error } = await client
    .from('diary_entries')
    .select(DIARY_ROW_SELECT)
    .eq('user_id', userId)
    .eq('media_type', toDbMediaType(key.mediaType))
    .eq('media_id', toDbMediaId(key.mediaId))
    .eq('review_scope', scope.review_scope)
    .eq('show_id', scope.show_id)
    .eq('season_number', scope.season_number)
    .eq('episode_number', scope.episode_number)
    .maybeSingle();
  if (error) throw error;
  if (!data) return emptyDiaryEntry();

  return {
    rating:                 numOrNull(data.rating),
    review:                 data.review ?? '',
    watchedDate:            data.watched_date,
    favourite:              data.favourite,
    rewatch:                data.rewatch,
    containsSpoilers:       data.contains_spoilers,
    watchedInCinema:        data.watched_in_cinema,
    watchedLive:            data.watched_live,
    bingeWatched:           data.binge_watched,
    reread:                 data.reread,
    physicalBook:           data.physical_book,
    ebook:                  data.ebook,
    audiobook:              data.audiobook,
    attachmentUrl:          data.attachment_url,
    attachmentType:         data.attachment_type as AttachmentType | null,
    scoreRating:            numOrNull(data.score_rating),
    cinematographyRating:   numOrNull(data.cinematography_rating),
    writingRating:          numOrNull(data.writing_rating),
    performancesRating:     numOrNull(data.performances_rating),
    directionRating:        numOrNull(data.direction_rating),
    rewatchabilityRating:   numOrNull(data.rewatchability_rating),
    emotionalImpactRating:  numOrNull(data.emotional_impact_rating),
    entertainmentRating:    numOrNull(data.entertainment_rating),
    layerCharacters:        numOrNull(data.layer_characters),
    layerPlot:              numOrNull(data.layer_plot),
    layerPacing:            numOrNull(data.layer_pacing),
    layerWorldbuilding:     numOrNull(data.layer_worldbuilding),
    layerThemes:            numOrNull(data.layer_themes),
    layerRereadability:     numOrNull(data.layer_rereadability),
  };
}

export interface MediaCoreMeta {
  title:       string;
  posterUrl:   string | null;
  year:        number;
  genres:      string[];
  runtime:     number | null;
  voteAverage: number | null;
  director:    string | null;
}

/** Upserts onto the SAME row fetchLatestDiaryEntry would return for this key
 *  (identical conflict target) — updates in place, never inserts a second
 *  row for an already-logged title. */
export async function saveDiaryEntryFull(
  userId: string,
  key: DiaryScopeKey,
  core: MediaCoreMeta,
  entry: DiaryEntryFull,
): Promise<void> {
  const client = requireClient();
  const scope = resolveScope(key);
  const { error } = await client.from('diary_entries').upsert(
    {
      user_id:     userId,
      media_id:    toDbMediaId(key.mediaId),
      media_type:  toDbMediaType(key.mediaType),
      ...scope,
      title:       core.title,
      poster:      core.posterUrl,
      year:        core.year || 0,
      creator:     core.director,
      genres:      core.genres,
      runtime:     core.runtime,
      vote_average: core.voteAverage,
      rating:      entry.rating,
      review:      entry.review,
      watched_date: entry.watchedDate,
      favourite:    entry.favourite,
      rewatch:      entry.rewatch,
      contains_spoilers: entry.containsSpoilers,
      watched_in_cinema: entry.watchedInCinema,
      watched_live:      entry.watchedLive,
      binge_watched:     entry.bingeWatched,
      reread:            entry.reread,
      physical_book:     entry.physicalBook,
      ebook:             entry.ebook,
      audiobook:         entry.audiobook,
      attachment_url:    entry.attachmentUrl,
      attachment_type:   entry.attachmentType,
      score_rating:            entry.scoreRating,
      cinematography_rating:   entry.cinematographyRating,
      writing_rating:          entry.writingRating,
      performances_rating:     entry.performancesRating,
      direction_rating:        entry.directionRating,
      rewatchability_rating:   entry.rewatchabilityRating,
      emotional_impact_rating: entry.emotionalImpactRating,
      entertainment_rating:    entry.entertainmentRating,
      layer_characters:        entry.layerCharacters,
      layer_plot:              entry.layerPlot,
      layer_pacing:            entry.layerPacing,
      layer_worldbuilding:     entry.layerWorldbuilding,
      layer_themes:            entry.layerThemes,
      layer_rereadability:     entry.layerRereadability,
    },
    { onConflict: 'user_id,media_type,media_id,review_scope,season_number,episode_number' },
  );
  if (error) throw error;
}

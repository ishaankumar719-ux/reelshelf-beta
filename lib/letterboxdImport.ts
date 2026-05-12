import type { DiaryMovie } from "./diary";
import { localMovies } from "./localMovies";

export type LetterboxdImportPreviewItem = {
  sourceIndex: number;
  title: string;
  year: number;
  rating: number | null;
  watchedDate: string;
  review: string;
  rewatch: boolean;
  matchType: "local" | "imported";
  reason: string;
  diaryEntry: DiaryMovie;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeLookupValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeLookupValue(value).replace(/\s+/g, "-") || "imported-film";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
}

function getRecordValue(
  record: Record<string, string>,
  aliases: string[]
) {
  for (const alias of aliases) {
    const match = record[alias];
    if (typeof match === "string" && match.trim()) {
      return match.trim();
    }
  }

  return "";
}

function parseYear(value: string) {
  const match = value.match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : 0;
}

function parseRating(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed.replace(",", ".").replace(/[^0-9.]+/g, ""));

  if (Number.isNaN(numeric)) {
    return null;
  }

  const normalized = numeric <= 5 ? numeric * 2 : numeric;
  return Number(Math.min(10, Math.max(0, normalized)).toFixed(1));
}

function parseWatchedDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function parseRewatch(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["yes", "true", "1", "rewatch", "rewatched"].includes(normalized);
}

function savedAtFromWatchedDate(watchedDate: string) {
  const parsed = new Date(`${watchedDate}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

const localMovieIndex = new Map(
  localMovies.map((movie) => [
    `${normalizeLookupValue(movie.title)}::${movie.year}`,
    movie,
  ])
);

// ─── V2 types ─────────────────────────────────────────────────────────────────

export type LetterboxdFileType =
  | "diary"      // diary.csv   — Watched Date, Rewatch, Tags
  | "watched"    // watched.csv — Date, Name, Year
  | "ratings"    // ratings.csv — Date, Name, Year, Rating
  | "reviews"    // reviews.csv — Date, Name, Year, Rating, Review, Spoiler
  | "unknown"

export type ParsedLetterboxdEntry = {
  /** row number in original CSV (1-based, including header) */
  sourceRow: number
  title: string
  year: number
  rating: number | null
  watchedDate: string
  review: string
  rewatch: boolean
  containsSpoilers: boolean
  /** "local" = matched to ReelShelf catalogue; "imported" = slug-based id */
  matchType: "local" | "imported"
  diaryEntry: DiaryMovie
}

export type LetterboxdParseResult = {
  fileType: LetterboxdFileType
  entries: ParsedLetterboxdEntry[]
  stats: {
    total: number
    withRating: number
    withReview: number
    rewatches: number
    localMatches: number
  }
}

// ─── File-type detection ──────────────────────────────────────────────────────

export function detectLetterboxdFileType(headers: string[]): LetterboxdFileType {
  const h = new Set(headers.map(normalizeHeader))
  if (h.has("spoiler") || (h.has("review") && h.has("rating"))) return "reviews"
  if (h.has("rewatch") || h.has("watcheddate") || h.has("diarydate")) return "diary"
  if (h.has("rating") || h.has("yourrating")) return "ratings"
  if (h.has("name") || h.has("title")) return "watched"
  return "unknown"
}

// ─── V2 parser ────────────────────────────────────────────────────────────────

export function parseLetterboxdCsvV2(csvText: string): LetterboxdParseResult {
  const rows = parseCsv(csvText)

  if (rows.length < 2) {
    throw new Error(
      "This CSV appears empty — make sure you exported your Letterboxd diary first."
    )
  }

  const [headerRow, ...dataRows] = rows
  const normalizedHeaders = headerRow.map(normalizeHeader)
  const fileType = detectLetterboxdFileType(headerRow)

  const entries: ParsedLetterboxdEntry[] = []

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx]
    const record = normalizedHeaders.reduce<Record<string, string>>(
      (acc, header, col) => {
        acc[header] = row[col] ?? ""
        return acc
      },
      {}
    )

    const title = getRecordValue(record, ["name", "title", "filmtitle", "film"])
    const year = parseYear(getRecordValue(record, ["year", "releasedyear"]))

    if (!title || !year) continue

    const rating = parseRating(
      getRecordValue(record, ["rating", "yourrating", "memberrating"])
    )
    const review = getRecordValue(record, ["review", "reviewtext", "comments"])
    const watchedDate = parseWatchedDate(
      getRecordValue(record, [
        "watcheddate",
        "diarydate",
        "watched",
        "date",
      ])
    )
    const rewatch = parseRewatch(
      getRecordValue(record, ["rewatch", "rewatched", "rewatchstatus"])
    )
    const spoilerRaw = getRecordValue(record, ["spoiler", "spoilers", "containsspoilers"])
    const containsSpoilers =
      ["yes", "true", "1"].includes(spoilerRaw.toLowerCase())

    const localMatch = localMovieIndex.get(
      `${normalizeLookupValue(title)}::${year}`
    )

    const diaryEntry: DiaryMovie = {
      id: localMatch
        ? localMatch.id
        : `letterboxd-${slugify(title)}-${year}`,
      mediaType: "movie",
      title: localMatch?.title ?? title,
      poster: localMatch?.poster,
      year: localMatch ? Number(localMatch.year) : year,
      director: localMatch?.director,
      genres: [],
      runtime: localMatch
        ? Number(localMatch.runtime.replace(" min", "")) || undefined
        : undefined,
      voteAverage: undefined,
      rating,
      review,
      watchedDate,
      favourite: false,
      rewatch,
      containsSpoilers,
      watchedInCinema: false,
      savedAt: savedAtFromWatchedDate(watchedDate),
    }

    entries.push({
      sourceRow: idx + 2,
      title: diaryEntry.title,
      year: diaryEntry.year,
      rating,
      watchedDate,
      review,
      rewatch,
      containsSpoilers,
      matchType: localMatch ? "local" : "imported",
      diaryEntry,
    })
  }

  if (entries.length === 0) {
    throw new Error(
      "No valid rows were found. Make sure the file has Title and Year columns."
    )
  }

  const stats = {
    total: entries.length,
    withRating: entries.filter((e) => e.rating !== null).length,
    withReview: entries.filter((e) => e.review.trim().length > 0).length,
    rewatches: entries.filter((e) => e.rewatch).length,
    localMatches: entries.filter((e) => e.matchType === "local").length,
  }

  return { fileType, entries, stats }
}

export function parseLetterboxdCsv(csvText: string) {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw new Error("This CSV looks empty. Export your Letterboxd diary and try again.");
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const previewItems: LetterboxdImportPreviewItem[] = [];

  dataRows.forEach((row, rowIndex) => {
    const record = normalizedHeaders.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = row[index] || "";
      return accumulator;
    }, {});

    const title = getRecordValue(record, ["name", "title", "filmtitle", "film"]);
    const year = parseYear(getRecordValue(record, ["year", "releasedyear"]));

    if (!title || !year) {
      return;
    }

    const rating = parseRating(getRecordValue(record, ["rating", "yourrating", "memberrating"]));
    const review = getRecordValue(record, ["review", "reviewtext", "comments"]);
    const watchedDate = parseWatchedDate(
      getRecordValue(record, ["watcheddate", "diarydate", "watched", "date"])
    );
    const rewatch = parseRewatch(getRecordValue(record, ["rewatch", "rewatched", "rewatchstatus"]));
    const localMatch = localMovieIndex.get(
      `${normalizeLookupValue(title)}::${year}`
    );

    const diaryEntry: DiaryMovie = {
      id: localMatch ? localMatch.id : `letterboxd-${slugify(title)}-${year}`,
      mediaType: "movie",
      title: localMatch?.title || title,
      poster: localMatch?.poster,
      year: localMatch ? Number(localMatch.year) : year,
      director: localMatch?.director,
      genres: [],
      runtime: localMatch
        ? Number(localMatch.runtime.replace(" min", "")) || undefined
        : undefined,
      voteAverage: undefined,
      rating,
      review,
      watchedDate,
      favourite: false,
      rewatch,
      containsSpoilers: false,
      watchedInCinema: false,
      savedAt: savedAtFromWatchedDate(watchedDate),
    };

    previewItems.push({
      sourceIndex: rowIndex + 2,
      title: diaryEntry.title,
      year: diaryEntry.year,
      rating,
      watchedDate,
      review,
      rewatch,
      matchType: localMatch ? "local" : "imported",
      reason: localMatch
        ? "Matched to your ReelShelf film catalogue."
        : "Imported as a custom diary film with its own ReelShelf route.",
      diaryEntry,
    });
  });

  if (previewItems.length === 0) {
    throw new Error(
      "No valid diary rows were found. Make sure your Letterboxd export includes title and year columns."
    );
  }

  return previewItems;
}

export type MediaMeta = {
  genres: string[]
  voteAverage: number
}

const FILM_META: Record<string, MediaMeta> = {
  "interstellar":                       { genres: ["Science Fiction", "Drama", "Adventure"],            voteAverage: 8.4 },
  "the-dark-knight":                    { genres: ["Action", "Crime", "Thriller"],                      voteAverage: 9.0 },
  "whiplash":                           { genres: ["Drama", "Music"],                                   voteAverage: 8.5 },
  "babylon":                            { genres: ["Drama", "Comedy", "History"],                       voteAverage: 7.1 },
  "dune":                               { genres: ["Science Fiction", "Adventure", "Drama"],             voteAverage: 7.9 },
  "spider-man-across-the-spider-verse": { genres: ["Animation", "Action", "Adventure"],                 voteAverage: 8.4 },
  "heat":                               { genres: ["Action", "Crime", "Drama", "Thriller"],             voteAverage: 8.2 },
  "blade-runner-2049":                  { genres: ["Science Fiction", "Drama", "Neo-Noir"],             voteAverage: 7.6 },
  "midsommar":                          { genres: ["Horror", "Drama", "Mystery"],                       voteAverage: 7.1 },
  "fight-club":                         { genres: ["Drama", "Thriller"],                                voteAverage: 8.8 },
  "no-country-for-old-men":             { genres: ["Crime", "Drama", "Thriller"],                       voteAverage: 8.1 },
  "se7en":                              { genres: ["Crime", "Drama", "Mystery", "Thriller"],            voteAverage: 8.6 },
  "arrival":                            { genres: ["Science Fiction", "Drama", "Mystery"],              voteAverage: 7.9 },
  "sicario":                            { genres: ["Action", "Crime", "Drama", "Thriller"],             voteAverage: 7.6 },
  "drive":                              { genres: ["Action", "Crime", "Drama", "Neo-Noir"],             voteAverage: 7.8 },
  "the-social-network":                 { genres: ["Drama", "Biography"],                               voteAverage: 7.7 },
  "the-batman":                         { genres: ["Action", "Crime", "Drama", "Thriller"],             voteAverage: 7.8 },
  "oppenheimer":                        { genres: ["Drama", "Biography", "History"],                    voteAverage: 8.4 },
  "the-departed":                       { genres: ["Crime", "Drama", "Thriller"],                       voteAverage: 8.5 },
  "nightcrawler":                       { genres: ["Crime", "Drama", "Thriller"],                       voteAverage: 7.9 },
}

const TV_META: Record<string, MediaMeta> = {
  "succession":                { genres: ["Drama"],                                           voteAverage: 8.8 },
  "breaking-bad":              { genres: ["Crime", "Drama", "Thriller"],                      voteAverage: 9.5 },
  "game-of-thrones":           { genres: ["Fantasy", "Drama", "Action", "Adventure"],         voteAverage: 9.2 },
  "the-sopranos":              { genres: ["Crime", "Drama"],                                  voteAverage: 9.2 },
  "chernobyl":                 { genres: ["Drama", "History", "Mystery"],                     voteAverage: 9.4 },
  "true-detective":            { genres: ["Crime", "Drama", "Mystery", "Thriller"],           voteAverage: 9.0 },
  "mindhunter":                { genres: ["Crime", "Drama", "Mystery", "Thriller"],           voteAverage: 8.6 },
  "narcos":                    { genres: ["Crime", "Drama", "Biography"],                     voteAverage: 8.8 },
  "the-wire":                  { genres: ["Crime", "Drama"],                                  voteAverage: 9.3 },
  "invincible":                { genres: ["Animation", "Action", "Superhero"],                voteAverage: 8.7 },
  "daredevil":                 { genres: ["Action", "Crime", "Drama", "Superhero"],           voteAverage: 8.7 },
  "the-boys":                  { genres: ["Action", "Superhero", "Satire", "Drama"],          voteAverage: 8.7 },
  "stranger-things":           { genres: ["Drama", "Horror", "Science Fiction"],              voteAverage: 8.7 },
  "westworld":                 { genres: ["Science Fiction", "Drama", "Thriller"],            voteAverage: 8.6 },
  "peaky-blinders":            { genres: ["Crime", "Drama", "History"],                       voteAverage: 8.8 },
  "house-of-the-dragon":       { genres: ["Fantasy", "Drama", "Action"],                      voteAverage: 8.5 },
  "attack-on-titan":           { genres: ["Animation", "Action", "Fantasy", "Drama"],         voteAverage: 9.0 },
  "money-heist":               { genres: ["Crime", "Drama", "Thriller"],                      voteAverage: 8.3 },
  "the-bear":                  { genres: ["Drama", "Comedy"],                                 voteAverage: 8.6 },
  "prison-break":              { genres: ["Crime", "Drama", "Thriller"],                      voteAverage: 8.3 },
  "dragon-ball-z":             { genres: ["Animation", "Action", "Adventure"],                voteAverage: 8.7 },
  "avatar-the-last-airbender": { genres: ["Animation", "Action", "Adventure", "Fantasy"],    voteAverage: 9.2 },
  "the-legend-of-korra":       { genres: ["Animation", "Action", "Adventure", "Fantasy"],    voteAverage: 8.4 },
}

const BOOK_META: Record<string, MediaMeta> = {
  "the-alchemist":                        { genres: ["Literary Fiction", "Adventure", "Philosophy"],                    voteAverage: 7.7 },
  "dune-book":                            { genres: ["Science Fiction", "Philosophy", "Adventure"],                     voteAverage: 9.0 },
  "the-secret-history":                   { genres: ["Dark Academia", "Mystery", "Thriller"],                           voteAverage: 8.1 },
  "the-song-of-achilles":                 { genres: ["Mythic Fiction", "Historical Fiction", "Romance"],                voteAverage: 8.4 },
  "atomic-habits":                        { genres: ["Self-Improvement", "Non-Fiction", "Psychology"],                  voteAverage: 8.0 },
  "the-psychology-of-money":              { genres: ["Personal Finance", "Non-Fiction", "Psychology"],                  voteAverage: 8.2 },
  "normal-people":                        { genres: ["Contemporary Fiction", "Literary Fiction", "Romance"],             voteAverage: 7.8 },
  "a-little-life":                        { genres: ["Literary Fiction", "Drama"],                                       voteAverage: 8.6 },
  "the-midnight-library":                 { genres: ["Speculative Fiction", "Contemporary Fiction", "Philosophy"],       voteAverage: 7.8 },
  "the-silent-patient":                   { genres: ["Psychological Thriller", "Mystery", "Crime"],                     voteAverage: 8.3 },
  "intermezzo":                           { genres: ["Contemporary Fiction", "Literary Fiction"],                        voteAverage: 7.5 },
  "tomorrow-and-tomorrow-and-tomorrow":   { genres: ["Literary Fiction", "Contemporary Fiction"],                        voteAverage: 8.1 },
}

export function getMediaMeta(type: "film" | "tv" | "book", id: string): MediaMeta {
  const table = type === "film" ? FILM_META : type === "tv" ? TV_META : BOOK_META
  return table[id] ?? { genres: [], voteAverage: 0 }
}

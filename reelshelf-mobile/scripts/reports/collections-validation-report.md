# Collections Validation Report

Generated: 2026-07-21T19:47:31.611Z

## A24 company id verification

Verified company id: **41077** ("A24", origin_country US).

Confirmed via TMDB `/search/company?query=A24` (a second, unrelated company also named "A24", id 293354, origin GB, exists — not used) and cross-checked against `production_companies` on Moonlight (TMDB id 376867), which includes id 41077.

**Important caveat found during verification**: TMDB's `production_companies` field reflects production entities, not distributors. Hereditary, Midsommar, and Lady Bird are all real, well-known A24-distributed films, but none of them carry company id 41077 in this field — so the strict per-CONSTRAINTS check (`production_companies` contains the verified id) correctly flags them as not independently verifiable via this field, even though they are genuinely A24 films in the real world. They are marked `flagged`, not `verified`, with this exact caveat in their `verification_note` — not silently passed and not silently dropped.

## Data integrity findings (beyond this pass's scope, surfaced for visibility)

- The old static seed (scripts/generate-seed-data.ts) hardcoded 7 TMDB movie ids that resolve to the WRONG title or don't exist at all — none of these were caught until this validation ran real lookups against them: "Run Lola Run" was id 5765 (actually "Knight Moves"; correct id 104), "Zodiac" was id 929 (actually "Godzilla"; correct id 1949), "Gravity" was id 80537 (404, does not exist; correct id 49047), "Contact" was id 36557 (actually "Casino Royale"; correct id 686), "Nomadland" was id 752623 (actually "The Lost City"; correct id 581734), "The Florida Project" was id 435022 (404, does not exist; correct id 394117), "Drive" was id 79218 (actually "Ice Age: A Mammoth Christmas"; correct id 64690). All corrected in this script's COLLECTIONS list; the old static seed data itself is untouched by this data-only task but should be treated as unreliable.
- lib/discoverCollections.ts's live "neo-noir" TMDB discover query (with_keywords=6564) uses the wrong keyword id — TMDB keyword 6564 is "terminal illness", not "neo-noir" (confirmed via /keyword/6564 and /search/keyword?query=neo-noir, which gives 207268 as the real "neo-noir" keyword). This is a bug in currently-running app code (both mobile's port and the website's original), out of scope to fix in this schema/data-only task, but should be corrected in a future pass — it means the app's live Neo-Noir Discover row is not actually filtering by neo-noir at all right now.

## Per-collection summary

| Collection | Type | Verified | Flagged | Unverified |
|---|---|---|---|---|
| Best A24 Films | studio | 7 | 3 | 0 |
| Under 90 Minutes | runtime | 1 | 3 | 0 |
| Mind-Bending Stories | genre | 4 | 0 | 0 |
| True Crime Essentials | genre | 3 | 1 | 0 |
| Space Adventures | genre | 2 | 2 | 0 |
| Perfect Sunday Stories | genre | 4 | 0 | 0 |
| Greatest Horror | genre | 3 | 1 | 0 |
| Best Mind-Bending Films | genre | 4 | 0 | 0 |
| Perfect Sunday Watches | genre | 4 | 0 | 0 |
| Oscar Winners | awards | 0 | 4 | 0 |
| Coming of Age | curated | 3 | 1 | 0 |
| Neo-Noir | curated | 2 | 2 | 0 |

## Item detail

### Best A24 Films (`best-a24-films`)

- ✅ **Everything Everywhere All at Once** (2022, tmdb id 545611) — `verified` — production_companies includes id 41077 (A24)
- 🚩 **Hereditary** (2018, tmdb id 493922) — `flagged` — production_companies does NOT include id 41077 (A24) — TMDB's production_companies field reflects producers, not distributors, so a real A24-DISTRIBUTED title can legitimately fail this specific check (confirmed for Hereditary/Midsommar/Lady Bird — all real A24 films with no A24 entry in this field). Not independently verifiable via this field alone.
- 🚩 **Midsommar** (2019, tmdb id 530385) — `flagged` — production_companies does NOT include id 41077 (A24) — TMDB's production_companies field reflects producers, not distributors, so a real A24-DISTRIBUTED title can legitimately fail this specific check (confirmed for Hereditary/Midsommar/Lady Bird — all real A24 films with no A24 entry in this field). Not independently verifiable via this field alone.
- ✅ **Moonlight** (2016, tmdb id 376867) — `verified` — production_companies includes id 41077 (A24)
- ✅ **The Lighthouse** (2019, tmdb id 503919) — `verified` — production_companies includes id 41077 (A24)
- ✅ **Uncut Gems** (2019, tmdb id 473033) — `verified` — production_companies includes id 41077 (A24)
- 🚩 **Lady Bird** (2017, tmdb id 391713) — `flagged` — production_companies does NOT include id 41077 (A24) — TMDB's production_companies field reflects producers, not distributors, so a real A24-DISTRIBUTED title can legitimately fail this specific check (confirmed for Hereditary/Midsommar/Lady Bird — all real A24 films with no A24 entry in this field). Not independently verifiable via this field alone.
- ✅ **The Green Knight** (2021, tmdb id 559907) — `verified` — production_companies includes id 41077 (A24)
- ✅ **Past Lives** (2023, tmdb id 666277) — `verified` — production_companies includes id 41077 (A24)
- ✅ **The Zone of Interest** (2023, tmdb id 467244) — `verified` — production_companies includes id 41077 (A24)

### Under 90 Minutes (`under-90-minutes`)

- ✅ **Run Lola Run** (1998, tmdb id 104) — `verified` — runtime=80 (rule: <= 90)
- 🚩 **Whiplash** (2014, tmdb id 244786) — `flagged` — runtime=107 (rule: <= 90)
- 🚩 **Moonlight** (2016, tmdb id 376867) — `flagged` — runtime=111 (rule: <= 90)
- 🚩 **Get Out** (2017, tmdb id 419430) — `flagged` — runtime=104 (rule: <= 90)

### Mind-Bending Stories (`mind-bending-stories`)

- ✅ **Inception** (2010, tmdb id 27205) — `verified` — genre_ids=[28,878,12] (rule: any of [878,53])
- ✅ **Arrival** (2016, tmdb id 329865) — `verified` — genre_ids=[18,878,9648] (rule: any of [878,53])
- ✅ **Blade Runner 2049** (2017, tmdb id 335984) — `verified` — genre_ids=[878,18] (rule: any of [878,53])
- ✅ **Fight Club** (1999, tmdb id 550) — `verified` — genre_ids=[18,53] (rule: any of [878,53])

### True Crime Essentials (`true-crime-essentials`)

- ✅ **Zodiac** (2007, tmdb id 1949) — `verified` — genre_ids=[80,9648,53] (rule: any of [80])
- ✅ **Prisoners** (2013, tmdb id 146233) — `verified` — genre_ids=[18,53,80] (rule: any of [80])
- 🚩 **Spotlight** (2015, tmdb id 314365) — `flagged` — genre_ids=[18,36] (rule: any of [80])
- ✅ **Knives Out** (2019, tmdb id 546554) — `verified` — genre_ids=[35,80,9648] (rule: any of [80])

### Space Adventures (`space-adventures`)

- ✅ **Interstellar** (2014, tmdb id 157336) — `verified` — genre_ids=[12,18,878] (rule: all of [878,12])
- ✅ **The Martian** (2015, tmdb id 286217) — `verified` — genre_ids=[878,18,12] (rule: all of [878,12])
- 🚩 **Gravity** (2013, tmdb id 49047) — `flagged` — genre_ids=[878,53,18] (rule: all of [878,12])
- 🚩 **Contact** (1997, tmdb id 686) — `flagged` — genre_ids=[18,878,9648] (rule: all of [878,12])

### Perfect Sunday Stories (`perfect-sunday-stories`)

- ✅ **Marriage Story** (2019, tmdb id 492188) — `verified` — genre_ids=[18] (rule: any of [18])
- ✅ **Moonlight** (2016, tmdb id 376867) — `verified` — genre_ids=[18] (rule: any of [18])
- ✅ **Her** (2013, tmdb id 152601) — `verified` — genre_ids=[10749,878,18] (rule: any of [18])
- ✅ **Nomadland** (2021, tmdb id 581734) — `verified` — genre_ids=[18] (rule: any of [18])

### Greatest Horror (`greatest-horror`)

- ✅ **Hereditary** (2018, tmdb id 493922) — `verified` — genre_ids=[27,9648,53] (rule: any of [27])
- ✅ **Get Out** (2017, tmdb id 419430) — `verified` — genre_ids=[9648,53,27] (rule: any of [27])
- ✅ **Midsommar** (2019, tmdb id 530385) — `verified` — genre_ids=[27,18,9648] (rule: any of [27])
- 🚩 **The Lighthouse** (2019, tmdb id 503919) — `flagged` — genre_ids=[18,14,53] (rule: any of [27])

### Best Mind-Bending Films (`best-mind-bending-films`)

- ✅ **Inception** (2010, tmdb id 27205) — `verified` — genre_ids=[28,878,12] (rule: any of [878,53])
- ✅ **Arrival** (2016, tmdb id 329865) — `verified` — genre_ids=[18,878,9648] (rule: any of [878,53])
- ✅ **Fight Club** (1999, tmdb id 550) — `verified` — genre_ids=[18,53] (rule: any of [878,53])
- ✅ **Mulholland Drive** (2001, tmdb id 1018) — `verified` — genre_ids=[53,18,9648] (rule: any of [878,53])

### Perfect Sunday Watches (`perfect-sunday-watches`)

- ✅ **Marriage Story** (2019, tmdb id 492188) — `verified` — genre_ids=[18] (rule: any of [18])
- ✅ **Her** (2013, tmdb id 152601) — `verified` — genre_ids=[10749,878,18] (rule: any of [18])
- ✅ **Moonlight** (2016, tmdb id 376867) — `verified` — genre_ids=[18] (rule: any of [18])
- ✅ **Nomadland** (2021, tmdb id 581734) — `verified` — genre_ids=[18] (rule: any of [18])

### Oscar Winners (`oscar-winners`)

- 🚩 **Parasite** (2019, tmdb id 496243) — `flagged` — No verified awards data source available in this project (confirmed in an earlier audit) — flagged pending manual curation, not silently treated as verified.
- 🚩 **Moonlight** (2016, tmdb id 376867) — `flagged` — No verified awards data source available in this project (confirmed in an earlier audit) — flagged pending manual curation, not silently treated as verified.
- 🚩 **Nomadland** (2021, tmdb id 581734) — `flagged` — No verified awards data source available in this project (confirmed in an earlier audit) — flagged pending manual curation, not silently treated as verified.
- 🚩 **Whiplash** (2014, tmdb id 244786) — `flagged` — No verified awards data source available in this project (confirmed in an earlier audit) — flagged pending manual curation, not silently treated as verified.

### Coming of Age (`coming-of-age`)

- ✅ **Moonlight** (2016, tmdb id 376867) — `verified` — keyword_ids=[2231,6270,1196,726,416,970,1721,1013,1803,2394,1946,6733,10683,10180,158718,164296,194226,195624,230701,258533,289844,325835] (rule: any of [10683])
- ✅ **The Florida Project** (2017, tmdb id 394117) — `verified` — keyword_ids=[1196,6054,970,1803,6139,2669,11494,10683,13088,14768,170154,179385,207597,208349,210597,226344,236472,238737,240315,241896,272917,309029] (rule: any of [10683])
- 🚩 **Whiplash** (2014, tmdb id 244786) — `flagged` — keyword_ids=[242,1416,4048,1523,2176,1640,2696,33896,164657,170418,176095,200918,202371,206298,207739,212404,236377,251667,268132,309029,324429,325778,325796,325808,336502] (rule: any of [10683])
- ✅ **Lady Bird** (2017, tmdb id 391713) — `verified` — keyword_ids=[6054,11254,10683,10049,11710,10809,12392,14549,33910,34125,157303,165402,172112,187056,240303,240315,240736,252104,281585] (rule: any of [10683])

### Neo-Noir (`neo-noir`)

- 🚩 **Blade Runner 2049** (2017, tmdb id 335984) — `flagged` — genre_ids=[878,18] (rule: any of [80]); keyword_ids=[2964,803,801,310,4565,9663,12190,12375,12670,14570,178657,218132,220903,233512,243676,277551,301096,325830,370793,375249] (rule: any of [207268])
- ✅ **Prisoners** (2013, tmdb id 146233) — `verified` — genre_ids=[18,53,80] (rule: any of [80]); keyword_ids=[904,1930,703,1715,5340,5905,7002,12565,14707,207268,234162,265839,315263,325776] (rule: any of [207268])
- 🚩 **Zodiac** (2007, tmdb id 1949) — `flagged` — genre_ids=[80,9648,53] (rule: any of [80]); keyword_ids=[918,736,387,818,6149,582,627,703,1228,5340,4399,4950,9826,10714,11727,12193,12570,33457,33722,54012,159743,173103,202399,208992,235210,244530,270813,277050,325763,325775,325817,325818] (rule: any of [207268])
- ✅ **Drive** (2011, tmdb id 64690) — `verified` — genre_ids=[18,53,80] (rule: any of [80]); keyword_ids=[642,3296,5956,11762,9748,10291,10226,11148,12670,14707,14795,159245,161137,161974,167352,181123,181324,207268,263959,273593,325778] (rule: any of [207268])

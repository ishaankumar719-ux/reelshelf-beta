import type { ReviewLayers } from "../types/diary";

type MediaType = "movie" | "tv" | "book";

// Weights for each review layer key per media type.
// These must sum to exactly 0.60 — the 40% overall rating takes the other 0.40.
// When a layer is left blank, its weight is redistributed proportionally
// across the present layers (including overall), so missing fields never
// penalise the score.

const OVERALL_WEIGHT = 0.4;

const FILM_LAYER_WEIGHTS: Partial<Record<keyof ReviewLayers, number>> = {
  direction_rating: 0.15,
  writing_rating: 0.12,
  performances_rating: 0.12,
  cinematography_rating: 0.10,
  score_rating: 0.06,
  rewatchability_rating: 0.03,
  emotional_impact_rating: 0.01,
  entertainment_rating: 0.01,
};

const TV_LAYER_WEIGHTS: Partial<Record<keyof ReviewLayers, number>> = {
  writing_rating: 0.15,
  performances_rating: 0.15,
  direction_rating: 0.10,
  score_rating: 0.10,
  cinematography_rating: 0.05,
  rewatchability_rating: 0.03,
  entertainment_rating: 0.02,
};

const BOOK_LAYER_WEIGHTS: Partial<Record<keyof ReviewLayers, number>> = {
  score_rating: 0.15,
  cinematography_rating: 0.15,
  writing_rating: 0.12,
  performances_rating: 0.08,
  direction_rating: 0.05,
  emotional_impact_rating: 0.03,
  entertainment_rating: 0.01,
  rewatchability_rating: 0.01,
};

function getLayerWeights(mediaType: MediaType) {
  if (mediaType === "tv") return TV_LAYER_WEIGHTS;
  if (mediaType === "book") return BOOK_LAYER_WEIGHTS;
  return FILM_LAYER_WEIGHTS;
}

/**
 * Calculates the ReelShelf Score for a diary entry.
 *
 * - Returns null when overallRating is null (no data to score from).
 * - Returns overallRating when no review layers have values (pass-through).
 * - Returns a weighted average of overallRating + present layer values when
 *   layers exist. Missing layers' weights are redistributed proportionally
 *   so blank fields never lower the score.
 * - Result is clamped to [1, 10] and rounded to 1 decimal place.
 */
export function calculateReelShelfScore(
  mediaType: MediaType,
  overallRating: number | null,
  reviewLayers: ReviewLayers | null | undefined,
): number | null {
  if (overallRating === null) return null;

  const layerWeights = getLayerWeights(mediaType);

  // Collect layer entries that have defined weights AND non-null values.
  const presentLayers: Array<{ value: number; weight: number }> = [];

  for (const [key, weight] of Object.entries(layerWeights) as Array<[keyof ReviewLayers, number]>) {
    const value = reviewLayers?.[key];
    if (typeof value === "number" && value !== null) {
      presentLayers.push({ value, weight });
    }
  }

  if (presentLayers.length === 0) {
    return overallRating;
  }

  const presentLayerWeightSum = presentLayers.reduce((sum, l) => sum + l.weight, 0);

  // Effective total weight = fixed overall weight + sum of weights for present layers.
  // This is always <= 1.0. We normalise all components against it so they sum to 1.
  const totalWeight = OVERALL_WEIGHT + presentLayerWeightSum;

  let score = (OVERALL_WEIGHT / totalWeight) * overallRating;

  for (const { value, weight } of presentLayers) {
    score += (weight / totalWeight) * value;
  }

  return Math.round(Math.min(10, Math.max(1, score)) * 10) / 10;
}

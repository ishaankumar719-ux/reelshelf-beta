import { getMovieHrefFromRouteId } from "./movieRoutes";
import { getBookHrefFromRouteId } from "./bookRoutes";
import { getSeriesHrefFromRouteId } from "./seriesRoutes";
import type { MediaType } from "./media";

export function getMediaHref({
  id,
  mediaType,
}: {
  id: string;
  mediaType: MediaType;
}) {
  if (mediaType === "movie") {
    return getMovieHrefFromRouteId(id);
  }

  if (mediaType === "tv") {
    return getSeriesHrefFromRouteId(id);
  }

  return getBookHrefFromRouteId(id);
}

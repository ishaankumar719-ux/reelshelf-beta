import { getLocalBookByRouteId } from "./localBooks";

export function getBookHrefFromRouteId(id: string) {
  return `/books/${id}`;
}

export function normalizeBookRouteId(id: string) {
  const localBook = getLocalBookByRouteId(id);
  return localBook ? localBook.id : null;
}

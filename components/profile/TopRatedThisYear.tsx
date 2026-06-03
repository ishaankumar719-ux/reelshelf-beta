import type { TopRatedEntry } from "@/utils/profileStats";

export default function TopRatedThisYear({
  entries,
}: {
  entries: TopRatedEntry[];
}) {
  if (entries.length === 0) return null;

  const shown = entries.slice(0, 4);

  return (
    <div className="md:col-span-1 w-full rounded-2xl bg-white/[0.04] p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
        Top Rated · 2026
      </p>

      <div
        className="-mx-4 px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible"
        style={{ scrollbarWidth: "none" }}
      >
        {shown.map((entry) => (
          <div
            key={entry.id}
            className="w-[100px] shrink-0 snap-start aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 md:w-auto"
          >
            {entry.poster ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://image.tmdb.org/t/p/w154${entry.poster}`}
                alt={entry.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs px-1 text-center leading-tight">
                {entry.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 4 - shown.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-[100px] shrink-0 aspect-[2/3] rounded-md bg-white/[0.02] md:w-auto md:flex-1"
          />
        ))}
      </div>

      <p className="text-xs text-zinc-500 leading-snug">
        {shown[0]?.title}
        {shown.length > 1 && (
          <span className="text-zinc-600"> +{shown.length - 1} more</span>
        )}
      </p>
    </div>
  );
}

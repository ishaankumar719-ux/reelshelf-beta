import type { ProfileStats } from "@/utils/profileStats";

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 text-center md:text-left">
      <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-500">
        {label}
      </p>
      <p className="text-lg md:text-xl font-light text-zinc-50 tabular-nums">{value}</p>
    </div>
  );
}

export default function TasteSnapshot({ stats }: { stats: ProfileStats }) {
  const avgDisplay =
    stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—";

  return (
    <div className="mx-4 md:mx-0 w-full rounded-2xl bg-white/[0.04] p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
        Taste Snapshot
      </p>

      <div className="grid grid-cols-4 gap-2 md:grid-cols-2 md:gap-x-3 md:gap-y-2">
        <StatCell label="Films" value={stats.filmCount} />
        <StatCell label="TV" value={stats.tvCount} />
        <StatCell label="Books" value={stats.bookCount} />
        <StatCell label="Avg" value={avgDisplay} />
      </div>

      {stats.currentObsession && (
        <div className="border-t border-white/[0.05] pt-3">
          <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-500 mb-2">
            Current Obsession
          </p>
          <div className="flex items-center gap-3">
            {stats.currentObsession.poster && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://image.tmdb.org/t/p/w92${stats.currentObsession.poster}`}
                alt={stats.currentObsession.title}
                width={28}
                height={42}
                className="rounded object-cover flex-shrink-0"
                style={{ width: 28, height: 42 }}
              />
            )}
            <p className="text-sm text-zinc-200 leading-snug line-clamp-2">
              {stats.currentObsession.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

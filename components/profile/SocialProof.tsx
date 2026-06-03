import type { ProfileStats } from "@/utils/profileStats";

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-500">
        {label}
      </p>
      <p className="text-xl font-light text-zinc-50 tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function SocialProof({ stats }: { stats: ProfileStats }) {
  return (
    <div className="snap-start min-w-[220px] md:min-w-0 rounded-2xl bg-white/[0.04] p-5 flex flex-col gap-4 shrink-0 md:shrink">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
        Social
      </p>
      <div className="grid grid-cols-3 gap-2">
        <StatCell label="Followers" value={stats.followersCount} />
        <StatCell label="Following" value={stats.followingCount} />
        <StatCell label="Reactions" value={stats.totalReactions} />
      </div>
      <p className="text-[10px] text-zinc-700 leading-snug">
        Reactions counted across your diary
      </p>
    </div>
  );
}

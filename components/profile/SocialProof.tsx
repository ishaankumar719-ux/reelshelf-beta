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
    <div className="mx-4 md:mx-0 w-full rounded-2xl bg-white/[0.04] p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
        Social
      </p>
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 md:flex md:gap-8">
        <StatCell label="Followers" value={stats.followersCount} />
        <StatCell label="Following" value={stats.followingCount} />
        <StatCell label="Reactions" value={stats.totalReactions} />
      </div>
    </div>
  );
}

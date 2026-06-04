"use client"

interface ListCoverGridProps {
  posters: string[]
}

export default function ListCoverGrid({ posters }: ListCoverGridProps) {
  // Drop empty strings and nulls, take up to 4
  const filled = posters.filter(Boolean).slice(0, 4)
  const count  = filled.length

  if (count === 0) {
    return (
      <div className="w-full h-full bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-3xl opacity-30">🎬</span>
        <div className="w-8 h-px bg-zinc-800" />
        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">
          Empty List
        </span>
      </div>
    )
  }

  // Grid density based on poster count
  const gridCls =
    count >= 4 ? "grid-cols-2 grid-rows-2"
    : count === 3 ? "grid-cols-2 grid-rows-2"
    : count === 2 ? "grid-cols-2 grid-rows-1"
    : "grid-cols-1 grid-rows-1"

  return (
    <div
      className={`w-full h-full bg-zinc-900 rounded-xl overflow-hidden grid gap-0.5 border border-zinc-900 ${gridCls}`}
    >
      {filled.map((url, i) => (
        <div
          key={i}
          className={`relative w-full h-full bg-zinc-950 overflow-hidden${count === 3 && i === 2 ? " col-span-2" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  )
}

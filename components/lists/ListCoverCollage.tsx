"use client"

import Image from "next/image"

export interface ListCoverItem {
  url: string | null
  alt: string
}

interface ListCoverCollageProps {
  items: ListCoverItem[]
  className?: string
}

const FRAME = "w-full h-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-900"

export default function ListCoverCollage({ items, className = "" }: ListCoverCollageProps) {
  const slots = items.slice(0, 4)
  const count = slots.length

  if (count === 0) {
    return (
      <div className={`w-full h-full bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center ${className}`}>
        <span className="text-3xl opacity-30" aria-hidden="true">🎬</span>
        <div className="w-8 h-px bg-zinc-800" />
        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">
          Empty List
        </span>
      </div>
    )
  }

  if (count === 1) {
    return (
      <div className={`${FRAME} ${className}`}>
        <Cell item={slots[0]} sizes="(max-width: 768px) 100vw, 400px" />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div className={`${FRAME} grid grid-cols-2 grid-rows-1 gap-0.5 ${className}`}>
        <Cell item={slots[0]} sizes="(max-width: 768px) 50vw, 200px" />
        <Cell item={slots[1]} sizes="(max-width: 768px) 50vw, 200px" />
      </div>
    )
  }

  // 3 or 4 items — 2x2 grid; a missing 4th item renders as a dark empty cell
  return (
    <div className={`${FRAME} grid grid-cols-2 grid-rows-2 gap-0.5 ${className}`}>
      <Cell item={slots[0]} sizes="(max-width: 768px) 50vw, 200px" />
      <Cell item={slots[1]} sizes="(max-width: 768px) 50vw, 200px" />
      <Cell item={slots[2]} sizes="(max-width: 768px) 50vw, 200px" />
      {count === 4 ? <Cell item={slots[3]} sizes="(max-width: 768px) 50vw, 200px" /> : <EmptyCell />}
    </div>
  )
}

function Cell({ item, sizes }: { item: ListCoverItem; sizes: string }) {
  if (!item.url) return <EmptyCell />
  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
      <Image src={item.url} alt={item.alt} fill sizes={sizes} className="object-cover" />
    </div>
  )
}

function EmptyCell() {
  return (
    <div className="relative w-full h-full bg-zinc-950 flex items-center justify-center" aria-hidden="true">
      <span className="text-base opacity-15">🎬</span>
    </div>
  )
}

import Link from "next/link"

type MovieCardProps = {
  id: number
  title: string
  year: string
  description: string
  image: string
}

export default function MovieCard({
  id,
  title,
  year,
  description,
  image,
}: MovieCardProps) {
  return (
    <Link href={`/films/${id}`} className="group block">
      <article className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-900">
        <div className="overflow-hidden">
          <img
            src={image}
            alt={title}
            className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div className="p-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            {year}
          </p>

          <h3 className="mt-2 line-clamp-2 text-xl font-semibold text-white">
            {title}
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
            {description}
          </p>

          <div className="mt-5 inline-flex items-center text-sm font-medium text-white/80 transition group-hover:text-white">
            View details
            <span className="ml-2 transition group-hover:translate-x-1">→</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

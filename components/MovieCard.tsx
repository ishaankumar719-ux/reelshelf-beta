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
      <article className="rs-card-hover rounded-card border border-rs-border-subtle bg-rs-surface-card">
        <div className="overflow-hidden rounded-t-card">
          <img
            src={image}
            alt={title}
            className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div className="p-4">
          <p className="text-micro uppercase tracking-label text-rs-text-muted">
            {year}
          </p>

          <h3 className="mt-2 line-clamp-2 text-heading text-rs-text-primary">
            {title}
          </h3>

          <p className="mt-3 line-clamp-3 text-body text-rs-text-secondary">
            {description}
          </p>

          <div className="mt-4 inline-flex items-center text-caption text-rs-text-secondary transition group-hover:text-rs-text-primary">
            View details
            <span className="ml-2 transition group-hover:translate-x-1">→</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

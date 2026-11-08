import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookHrefFromRouteId } from "@/lib/bookRoutes";
import { getFranchiseCommunity } from "@/lib/franchiseCommunities";
import { getMovieHrefFromTmdbId } from "@/lib/movieRoutes";
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes";

const titleGroups = [
  { type: "book", label: "Books", getHref: getBookHrefFromRouteId },
  { type: "film", label: "Films", getHref: (id: string) => getMovieHrefFromTmdbId(Number(id)) },
  { type: "series", label: "Series", getHref: (id: string) => getSeriesHrefFromTmdbId(Number(id)) },
] as const;

const sections = [
  { id: "titles", label: "Titles" },
  { id: "discussion", label: "Discussion" },
] as const;

export async function generateMetadata({ params }: PageProps<"/community/[slug]">) {
  const community = getFranchiseCommunity((await params).slug);
  if (!community) return {};

  return {
    title: `${community.name} Community | ReelShelf`,
    description: community.description,
  };
}

export default async function CommunityPage({ params, searchParams }: PageProps<"/community/[slug]">) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const community = getFranchiseCommunity(slug);
  if (!community) notFound();

  const href = `/community/${community.slug}`;
  const activeTab = tab === "discussion" ? "discussion" : "titles";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="rounded-3xl border border-amber-100/15 bg-linear-to-br from-[#382117] via-[#231516] to-[#100e13] px-6 py-12 sm:px-12 sm:py-20">
        <p className="mb-3 font-sans text-xs font-semibold tracking-widest text-amber-200 uppercase">
          Franchise community
        </p>
        <h1 className="text-4xl tracking-tight sm:text-6xl">{community.name}</h1>
        <p className="mt-4 max-w-xl font-sans text-base text-white/75">{community.description}</p>
      </header>

      <nav aria-label="Community sections" className="my-6 flex gap-2 border-b border-white/10 font-sans">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.id === "titles" ? href : `${href}?tab=discussion`}
            aria-current={activeTab === section.id ? "page" : undefined}
            className="inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm text-white/75 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:border-amber-300 aria-[current=page]:text-white"
          >
            {section.label}
          </Link>
        ))}
      </nav>

      {activeTab === "discussion" ? (
        <section aria-labelledby="discussion-heading" className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="mb-3 font-sans text-xs font-semibold tracking-widest text-amber-200 uppercase">
            Spoiler-free discussion starter
          </p>
          <h2 id="discussion-heading" className="text-2xl">{community.discussion.title}</h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-white/75">{community.discussion.prompt}</p>
          <p className="mt-4 font-sans text-sm text-white/65">Replies aren’t open yet.</p>
        </section>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {titleGroups.map(({ type, label, getHref }) => {
            const titles = community.titles.filter((title) => title.type === type);
            if (!titles.length) return null;

            return (
              <section key={type} aria-labelledby={type}>
                <h2 id={type} className="mb-3 text-2xl">{label}</h2>
                <ul className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {titles.map((title) => (
                    <li key={title.id} className="border-b border-white/10 last:border-b-0">
                      <Link
                        href={getHref(title.id)}
                        className="flex min-h-12 items-center justify-between gap-4 px-4 py-3 font-sans text-sm text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2"
                      >
                        <span>{title.title}</span>
                        <span className="text-white/65">{title.year}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

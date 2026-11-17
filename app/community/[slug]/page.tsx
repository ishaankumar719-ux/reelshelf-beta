import Link from "next/link";
import { notFound } from "next/navigation";
import CommunityTitleCard from "@/components/community/CommunityTitleCard";
import CommunityTitleRow from "@/components/community/CommunityTitleRow";
import { getBookHrefFromRouteId } from "@/lib/bookRoutes";
import { getFranchiseCommunity, type FranchiseMediaType } from "@/lib/franchiseCommunities";
import { getMovieHrefFromTmdbId } from "@/lib/movieRoutes";
import { getTMDBPosterUrl } from "@/lib/posters";
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";
import { getBackdropUrl } from "@/src/lib/tmdb-image";

const titleGroups = [
  { type: "book", label: "Books", kind: "Book", getHref: getBookHrefFromRouteId },
  { type: "film", label: "Films", kind: "Film", getHref: (id: string) => getMovieHrefFromTmdbId(Number(id)) },
  { type: "series", label: "Series", kind: "Series", getHref: (id: string) => getSeriesHrefFromTmdbId(Number(id)) },
] as const;

const sections = [
  { id: "titles", label: "Books & Films" },
  { id: "discussion", label: "Discussion" },
] as const;

const openLibraryCover = (coverId: number) => `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;

async function getOpenLibraryCover(workId: string) {
  try {
    const res = await fetch(`https://openlibrary.org/works/${workId}.json`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const work = (await res.json()) as { covers?: number[] };
      const coverId = work.covers?.find((id) => id > 0);
      if (coverId) return openLibraryCover(coverId);
    }

    // Some works (e.g. Sunrise on the Reaping) have no cover on the work record,
    // but the search index carries one from their editions.
    const search = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(`key:"/works/${workId}"`)}&fields=cover_i&limit=1`,
      { next: { revalidate: 86400 } },
    );
    if (!search.ok) return null;
    const data = (await search.json()) as { docs?: Array<{ cover_i?: number }> };
    const coverId = data.docs?.[0]?.cover_i;
    return coverId && coverId > 0 ? openLibraryCover(coverId) : null;
  } catch {
    return null;
  }
}

async function getTitleImage(type: FranchiseMediaType, id: string) {
  if (type === "book") return getOpenLibraryCover(id);
  const details = type === "film" ? await getMovieDetails(Number(id)) : await getTVDetails(Number(id));
  return getTMDBPosterUrl(details?.poster_path);
}

async function getFeaturedBackdrop(filmId: string) {
  try {
    const details = await getMovieDetails(Number(filmId));
    return getBackdropUrl(details?.backdrop_path, "w1280");
  } catch {
    return null;
  }
}

// "The Hunger Games: Catching Fire" reads as "Catching Fire" inside the franchise hub.
function shortLabel(title: string, franchiseName: string) {
  const prefix = `${franchiseName}: `;
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}

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
  const discussionHref = `${href}?tab=discussion`;
  const activeTab = tab === "discussion" ? "discussion" : "titles";
  const featured = community.featured;

  const [backdrop, images] = await Promise.all([
    featured ? getFeaturedBackdrop(featured.filmId) : null,
    activeTab === "titles"
      ? Promise.all(community.titles.map((title) => getTitleImage(title.type, title.id).catch(() => null)))
      : Promise.resolve([] as Array<string | null>),
  ]);

  const counts = titleGroups
    .map(({ type, label }) => ({ label, n: community.titles.filter((t) => t.type === type).length }))
    .filter(({ n }) => n > 0);

  return (
    <div className="mx-auto max-w-6xl overflow-x-clip">
      <header className="relative isolate overflow-hidden rounded-3xl border border-amber-200/15 bg-[#0e0a0b]">
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_30%] opacity-70"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_90%_at_85%_110%,rgba(234,88,12,0.35),transparent_60%),linear-gradient(180deg,rgba(14,10,11,0.25)_0%,rgba(14,10,11,0.7)_55%,#0e0a0b_100%)] sm:bg-[radial-gradient(ellipse_70%_90%_at_85%_110%,rgba(234,88,12,0.35),transparent_60%),linear-gradient(90deg,#0e0a0b_0%,rgba(14,10,11,0.85)_40%,rgba(14,10,11,0.2)_100%)]"
        />

        <div className="flex min-h-[26rem] flex-col justify-end px-5 py-8 sm:min-h-[28rem] sm:px-12 sm:py-12">
          <p className="font-sans text-xs font-semibold tracking-widest text-amber-200 uppercase">
            Franchise community · {counts.map(({ label, n }) => `${n} ${label.toLowerCase()}`).join(" · ")}
          </p>
          <h1 className="mt-2 font-sans text-sm font-medium text-white/75">{community.name}</h1>

          {featured ? (
            <div className="mt-6 max-w-xl">
              <p className="font-sans text-[11px] font-semibold tracking-widest text-white/60 uppercase">Featured</p>
              <p className="mt-1 text-4xl leading-none tracking-tight text-balance sm:text-6xl">{featured.title}</p>
              <p className="mt-4 font-sans text-base text-white/80">{featured.tagline}</p>
              <div className="mt-6 flex flex-wrap gap-3 font-sans text-sm font-medium">
                <Link
                  href={getBookHrefFromRouteId(featured.bookId)}
                  className="inline-flex min-h-11 items-center rounded-full bg-amber-200 px-5 text-[#1a0f0a]! transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
                >
                  View the book
                </Link>
                <Link
                  href={getMovieHrefFromTmdbId(Number(featured.filmId))}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 text-white! transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  View the film
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 max-w-xl font-sans text-base text-white/75">{community.description}</p>
          )}
        </div>
      </header>

      <nav aria-label="Community sections" className="my-6 flex gap-1 border-b border-white/10 font-sans">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.id === "titles" ? href : discussionHref}
            aria-current={activeTab === section.id ? "page" : undefined}
            className="inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm font-medium text-white/65! transition hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:border-amber-300 aria-[current=page]:text-white!"
          >
            {section.label}
          </Link>
        ))}
      </nav>

      {activeTab === "discussion" ? (
        <DiscussionStarter community={community} />
      ) : (
        <div className="space-y-10">
          <DiscussionStarter community={community} compact discussionHref={discussionHref} />

          {titleGroups.map(({ type, label, kind, getHref }) => {
            const titles = community.titles
              .map((title, i) => ({ title, image: images[i] ?? null }))
              .filter(({ title }) => title.type === type);
            if (!titles.length) return null;

            return (
              <CommunityTitleRow key={type} id={type} label={label} count={titles.length}>
                {titles.map(({ title, image }) => (
                  <li key={title.id} className="w-28 shrink-0 sm:w-36">
                    <CommunityTitleCard
                      href={getHref(title.id)}
                      title={title.title}
                      label={shortLabel(title.title, community.name)}
                      year={title.year}
                      imageUrl={image}
                      kind={kind}
                    />
                  </li>
                ))}
              </CommunityTitleRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiscussionStarter({
  community,
  compact = false,
  discussionHref,
}: {
  community: NonNullable<ReturnType<typeof getFranchiseCommunity>>;
  compact?: boolean;
  discussionHref?: string;
}) {
  const headingId = compact ? "starter-heading" : "discussion-heading";

  return (
    <section
      aria-labelledby={headingId}
      className={`relative overflow-hidden rounded-2xl border border-amber-200/20 bg-linear-to-br from-amber-200/[0.07] to-transparent ${compact ? "p-4 sm:p-5" : "p-5 sm:p-8"}`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-amber-300/80" />
      <div className="flex flex-wrap items-center gap-2 font-sans text-[11px] font-semibold tracking-widest uppercase">
        <span className="text-amber-200">From the ReelShelf editors</span>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">Spoiler-free</span>
      </div>
      <h2 id={headingId} className={`mt-2 max-w-3xl leading-snug text-balance ${compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}>
        {community.discussion.title}
      </h2>
      {compact && discussionHref ? (
        <Link
          href={discussionHref}
          className="mt-3 inline-flex min-h-11 items-center font-sans text-sm font-medium text-amber-200! transition hover:text-amber-100! focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Go to the discussion <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      ) : (
        <>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-white/75">{community.discussion.prompt}</p>
          <p className="mt-5 font-sans text-sm text-white/60">Replies open soon. For now, take the prompt with you.</p>
        </>
      )}
    </section>
  );
}

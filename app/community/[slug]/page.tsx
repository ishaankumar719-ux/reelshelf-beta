import Link from "next/link";
import { notFound } from "next/navigation";
import CommunityTitleCard from "@/components/community/CommunityTitleCard";
import { getBookHrefFromRouteId } from "@/lib/bookRoutes";
import { getFranchiseCommunity, type FranchiseMediaType } from "@/lib/franchiseCommunities";
import { getMovieHrefFromTmdbId } from "@/lib/movieRoutes";
import { getTMDBPosterUrl } from "@/lib/posters";
import { getSeriesHrefFromTmdbId } from "@/lib/seriesRoutes";
import { getMovieDetails, getTVDetails } from "@/lib/tmdb";

const titleGroups = [
  { type: "book", label: "Books", kind: "Book", getHref: getBookHrefFromRouteId },
  { type: "film", label: "Films", kind: "Film", getHref: (id: string) => getMovieHrefFromTmdbId(Number(id)) },
  { type: "series", label: "Series", kind: "Series", getHref: (id: string) => getSeriesHrefFromTmdbId(Number(id)) },
] as const;

const sections = [
  { id: "titles", label: "Books & Films" },
  { id: "discussion", label: "Discussion" },
] as const;

async function getOpenLibraryCover(workId: string) {
  try {
    const res = await fetch(`https://openlibrary.org/works/${workId}.json`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const work = (await res.json()) as { covers?: number[] };
    const coverId = work.covers?.find((id) => id > 0);
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  } catch {
    return null;
  }
}

async function getTitleImage(type: FranchiseMediaType, id: string) {
  if (type === "book") return getOpenLibraryCover(id);
  const details = type === "film" ? await getMovieDetails(Number(id)) : await getTVDetails(Number(id));
  return getTMDBPosterUrl(details?.poster_path);
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

  const images = activeTab === "titles"
    ? await Promise.all(community.titles.map((title) => getTitleImage(title.type, title.id).catch(() => null)))
    : [];

  const counts = titleGroups
    .map(({ type, label }) => ({ label, n: community.titles.filter((t) => t.type === type).length }))
    .filter(({ n }) => n > 0);

  return (
    <div className="mx-auto max-w-6xl overflow-x-clip">
      <header className="relative isolate overflow-hidden rounded-3xl border border-amber-200/15 bg-[#0e0a0b] px-5 py-10 sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_90%_at_85%_110%,rgba(234,88,12,0.45),transparent_60%),radial-gradient(ellipse_50%_60%_at_10%_-10%,rgba(251,191,36,0.16),transparent_70%),linear-gradient(160deg,#2a1610_0%,#120c0d_55%,#09080a_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-16 -bottom-24 -z-10 size-72 rounded-full border border-amber-300/15 sm:size-96"
        />
        <div
          aria-hidden="true"
          className="absolute -right-4 -bottom-12 -z-10 size-48 rounded-full border border-orange-400/20 sm:size-64"
        />

        <p className="mb-4 font-sans text-xs font-semibold tracking-widest text-amber-200 uppercase">
          Franchise community · Panem
        </p>
        <h1 className="text-4xl leading-none tracking-tight text-balance sm:text-7xl">{community.name}</h1>
        <p className="mt-5 max-w-xl font-sans text-base text-white/75">{community.description}</p>
        <p className="mt-6 font-sans text-sm text-white/60">
          {counts.map(({ label, n }) => `${n} ${label.toLowerCase()}`).join(" · ")}
        </p>
      </header>

      <nav
        aria-label="Community sections"
        className="my-6 flex gap-1 border-b border-white/10 font-sans"
      >
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.id === "titles" ? href : discussionHref}
            aria-current={activeTab === section.id ? "page" : undefined}
            className="inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-sm font-medium text-white/65 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:border-amber-300 aria-[current=page]:text-white"
          >
            {section.label}
          </Link>
        ))}
      </nav>

      {activeTab === "discussion" ? (
        <DiscussionStarter community={community} />
      ) : (
        <div className="space-y-12">
          <DiscussionStarter community={community} compact discussionHref={discussionHref} />

          {titleGroups.map(({ type, label, kind, getHref }) => {
            const titles = community.titles
              .map((title, i) => ({ title, image: images[i] ?? null }))
              .filter(({ title }) => title.type === type);
            if (!titles.length) return null;

            return (
              <section key={type} aria-labelledby={`${type}-heading`}>
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 id={`${type}-heading`} className="text-2xl sm:text-3xl">{label}</h2>
                  <span className="font-sans text-xs text-white/55">{titles.length} titles</span>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                  {titles.map(({ title, image }) => (
                    <li key={title.id} className="min-w-0">
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
                </ul>
              </section>
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
  return (
    <section
      aria-labelledby={compact ? "starter-heading" : "discussion-heading"}
      className="relative overflow-hidden rounded-2xl border border-amber-200/20 bg-linear-to-br from-amber-200/[0.07] to-transparent p-5 sm:p-8"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-amber-300/80" />
      <div className="flex flex-wrap items-center gap-2 font-sans text-[11px] font-semibold tracking-widest uppercase">
        <span className="text-amber-200">From the ReelShelf editors</span>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">Spoiler-free</span>
      </div>
      <h2
        id={compact ? "starter-heading" : "discussion-heading"}
        className="mt-3 max-w-3xl text-2xl leading-snug text-balance sm:text-3xl"
      >
        {community.discussion.title}
      </h2>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-white/75">{community.discussion.prompt}</p>
      {compact && discussionHref ? (
        <Link
          href={discussionHref}
          className="mt-5 inline-flex min-h-11 items-center rounded-full border border-amber-200/30 px-4 font-sans text-sm font-medium text-white transition hover:bg-amber-200/10 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Go to the discussion <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      ) : (
        <p className="mt-5 font-sans text-sm text-white/60">Replies open soon. For now, take the prompt with you.</p>
      )}
    </section>
  );
}

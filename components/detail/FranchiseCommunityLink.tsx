import Link from "next/link";
import { getFranchiseCommunityForTitle, type FranchiseMediaType } from "@/lib/franchiseCommunities";

export default function FranchiseCommunityLink({
  type,
  id,
}: { type: FranchiseMediaType; id: string }) {
  const community = getFranchiseCommunityForTitle(type, id);
  if (!community) return null;

  return (
    <Link
      href={`/community/${community.slug}`}
      className="my-6 inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 font-sans text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      Explore the {community.name} community <span aria-hidden="true" className="ml-2">↗</span>
    </Link>
  );
}

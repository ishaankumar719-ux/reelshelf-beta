import { createClient } from "@/lib/supabase/server";
import { getProfileStats } from "@/utils/profileStats";
import TasteSnapshot from "./TasteSnapshot";
import TopRatedThisYear from "./TopRatedThisYear";
import SocialProof from "./SocialProof";
import MostReactedReview from "./MostReactedReview";

export default async function ProfileHighlights({ userId }: { userId: string }) {
  const supabase = await createClient();
  if (!supabase) return null;

  const stats = await getProfileStats(supabase, userId);

  return (
    <section className="w-full py-5 px-4 md:px-6">
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible pb-3 md:pb-0"
        style={{ scrollbarWidth: "none" }}
      >
        <TasteSnapshot stats={stats} />
        {stats.topRatedThisYear.length > 0 && (
          <TopRatedThisYear entries={stats.topRatedThisYear} />
        )}
        <SocialProof stats={stats} />
        {stats.mostReactedReview && (
          <MostReactedReview review={stats.mostReactedReview} />
        )}
      </div>
    </section>
  );
}

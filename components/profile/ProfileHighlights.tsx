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
    <section className="w-full py-4 md:py-5 md:px-6">
      <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-4">
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

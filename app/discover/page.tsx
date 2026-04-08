import DiscoverShelvesClient from "../../components/DiscoverShelvesClient";
import { getDiscoverProfiles } from "../../lib/publicProfiles";
import { createClient } from "../../lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 0 80px",
        }}
      >
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.95) 0%, rgba(10,10,10,0.96) 100%)",
            padding: 24,
            color: "#e5e7eb",
          }}
        >
          Supabase is not configured yet, so public shelves can’t be discovered.
        </div>
      </main>
    );
  }

  const profiles = await getDiscoverProfiles(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let followingIds: string[] = [];

  if (user) {
    const { data } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);

    followingIds = (data || []).map((row) => row.following_id);
  }

  return (
    <DiscoverShelvesClient
      profiles={profiles}
      followingIds={followingIds}
      currentUserId={user?.id || null}
    />
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../../../components/AuthProvider";
import ShelfBrowser from "../../../../components/shelves/ShelfBrowser";
import { createClient } from "../../../../lib/supabase/client";
import { loadProfileShelves, type Shelf } from "../../../../lib/shelves";
import ShelvesSkeleton from "../../../../components/shelves/ShelvesSkeleton";

export default function FriendShelvesClient({
  username,
  shelf,
  token,
  tabs,
}: {
  username: string;
  shelf: string | null;
  token: string | null;
  tabs?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<{ shelves: Shelf[]; name: string; missing?: boolean } | null>(null);

  useEffect(() => {
    if (loading) return;
    const sb = createClient();
    if (!sb) return;
    let live = true;
    (async () => {
      const { data: prof } = await sb.from("public_profiles").select("id, username, display_name").eq("username", username.trim().toLowerCase()).maybeSingle();
      if (!prof) return live && setState({ shelves: [], name: username, missing: true });
      const shelves = await loadProfileShelves(sb, prof.id, { shelf, token });
      if (live) setState({ shelves, name: prof.display_name || prof.username || username });
    })();
    return () => {
      live = false;
    };
  }, [loading, username, shelf, token, user?.id]);

  return (
    <main style={{ minHeight: "100vh", background: "#0d0c0b", color: "#f4f1ea", padding: "28px 16px 120px", fontFamily: "\"Helvetica Now Display\",\"Helvetica Neue\",Helvetica,Arial,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ margin: "0 4px 14px" }}>
          <Link href={`/u/${username}`} style={{ color: "rgba(255,255,255,.55)", fontSize: 13, textDecoration: "none" }}>
            @{username}
          </Link>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {state ? `${state.name}’s shelves` : "Shelves"}
          </h1>
        </div>
        {tabs ? <div style={{ margin: "0 4px" }}>{tabs}</div> : null}
        {state === null ? (
          <ShelvesSkeleton />
        ) : state.missing ? (
          <p style={{ color: "rgba(255,255,255,.6)" }}>We couldn’t find that profile.</p>
        ) : state.shelves.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,.6)" }}>{shelf ? "This shelf isn’t available. The link may have changed." : "No public shelves yet."}</p>
        ) : (
          <ShelfBrowser shelves={state.shelves} canEdit={false} storageKey={`shelves:u:${username}:${shelf ?? ""}`} />
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import ShelfBrowser from "../../components/shelves/ShelfBrowser";
import ShelvesSkeleton from "../../components/shelves/ShelvesSkeleton";
import { createClient } from "../../lib/supabase/client";
import { loadOwnShelves, saveShelfOrder, setShelfVisibility, type Shelf, type ShelfItem, type Visibility } from "../../lib/shelves";

export default function ShelvesPage() {
  const { user, profile, loading } = useAuth();
  const [shelves, setShelves] = useState<Shelf[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimers = useRef(new Map<string, number>());

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setShelves([]);
      return;
    }
    const sb = createClient();
    if (!sb) return;
    let live = true;
    loadOwnShelves(sb, user.id, profile?.username ?? null)
      .then(({ shelves }) => live && setShelves(shelves))
      .catch(() => live && setError("Couldn't load your shelves."));
    return () => {
      live = false;
    };
  }, [loading, user, profile?.username]);

  const onReorder = useCallback((shelf: Shelf, items: ShelfItem[]) => {
    setShelves((cur) => cur?.map((s) => (s.id === shelf.id ? { ...s, items: s.ranked ? items.map((it, i) => ({ ...it, rank: i + 1 })) : items } : s)) ?? cur);
    const sb = createClient();
    if (!sb) return;
    // Coalesce quick successive moves into one write.
    window.clearTimeout(saveTimers.current.get(shelf.id));
    saveTimers.current.set(
      shelf.id,
      window.setTimeout(async () => {
        const { error } = await saveShelfOrder(sb, shelf, items);
        if (error) setError("Couldn't save the new order. Try again.");
      }, 450)
    );
  }, []);

  const onVisibility = useCallback(
    async (shelf: Shelf, v: Visibility) => {
      if (!user) return;
      const sb = createClient();
      if (!sb) return;
      const prev = shelf.visibility;
      setShelves((cur) => cur?.map((s) => (s.id === shelf.id ? { ...s, visibility: v } : s)) ?? cur);
      const { error } = await setShelfVisibility(sb, user.id, shelf, v);
      if (error) {
        setShelves((cur) => cur?.map((s) => (s.id === shelf.id ? { ...s, visibility: prev } : s)) ?? cur);
        setError("Couldn't update who can see that shelf.");
        return;
      }
      // Reload so unlisted links carry the share token.
      const fresh = await loadOwnShelves(sb, user.id, profile?.username ?? null);
      setShelves(fresh.shelves);
    },
    [user, profile?.username]
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0d0c0b", color: "#f4f1ea", padding: "28px 16px 120px", fontFamily: "\"Helvetica Now Display\",\"Helvetica Neue\",Helvetica,Arial,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, margin: "0 4px 14px" }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Shelves</h1>
          {profile?.username ? (
            <Link href={`/u/${profile.username}/shelves`} style={{ color: "rgba(255,255,255,.55)", fontSize: 13 }}>
              See what others see
            </Link>
          ) : null}
        </div>
        {error ? (
          <p role="alert" style={{ color: "#f3a17a", fontSize: 13, margin: "0 4px 12px" }}>
            {error}
          </p>
        ) : null}
        {!loading && !user ? (
          <p style={{ color: "rgba(255,255,255,.6)" }}>
            <Link href="/auth" style={{ color: "#fff" }}>
              Sign in
            </Link>{" "}
            to see your shelves.
          </p>
        ) : shelves === null ? (
          <ShelvesSkeleton />
        ) : (
          <ShelfBrowser shelves={shelves} canEdit storageKey="shelves:own" onReorder={onReorder} onVisibility={onVisibility} />
        )}
      </div>
    </main>
  );
}


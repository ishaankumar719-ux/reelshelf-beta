"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import WatchlistGrid, {
  type SavedItem,
} from "../../components/watchlist/WatchlistGrid";
import { createClient as createSupabaseClient } from "../../lib/supabase/client";

const SAVED_ITEMS_SELECT =
  "id, user_id, list_type, media_id, media_type, title, poster, year, " +
  "creator, genres, runtime, vote_average, added_at";

function getSubtitle(count: number) {
  if (count === 0) {
    return "Nothing saved yet — find something for tonight";
  }

  if (count === 1) {
    return "1 title saved · saved for your next night in";
  }

  return `${count} titles saved · your next watch starts here`;
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <svg
        viewBox="0 0 24 24"
        width="40"
        height="40"
        aria-hidden="true"
        style={{ color: "rgba(255,255,255,0.24)" }}
      >
        <path
          d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <p
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.5)",
          marginTop: 16,
          marginBottom: 0,
        }}
      >
        Nothing saved yet
      </p>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.25)",
          marginTop: 4,
          marginBottom: 0,
        }}
      >
        Browse films and series to build your watchlist
      </p>
    </div>
  );
}

export default function WatchlistPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      if (loading) {
        return;
      }

      if (!user) {
        if (!cancelled) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      const supabase = createSupabaseClient();

      if (!supabase) {
        if (!cancelled) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase
        .from("saved_items")
        .select(SAVED_ITEMS_SELECT)
        .eq("user_id", user.id)
        .eq("list_type", "watchlist")
        .order("added_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("[WATCHLIST] fetch error:", error.message);
        setItems([]);
      } else {
        setItems(((data ?? []) as unknown) as SavedItem[]);
      }

      setIsLoading(false);
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  const subtitle = useMemo(() => getSubtitle(items.length), [items.length]);

  function handleRemoved(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function handleRestored(item: SavedItem) {
    setItems((current) => {
      const exists = current.some((entry) => entry.id === item.id);

      if (exists) {
        return current;
      }

      return [...current, item].sort(
        (left, right) =>
          new Date(right.added_at).getTime() - new Date(left.added_at).getTime()
      );
    });
  }

  return (
    <main style={{ padding: "32px 0 40px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
        <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.02em",
          }}
        >
          My Watchlist
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {subtitle}
        </p>
        </header>

        {isLoading ? null : items.length === 0 ? (
          <EmptyState />
        ) : (
          <WatchlistGrid
            items={items}
            userId={user?.id ?? null}
            onRemoved={handleRemoved}
            onRestored={handleRestored}
          />
        )}

      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "../../../lib/supabase/client";
import { useDiaryLog } from "../../../hooks/useDiaryLog";
import MediaReviewsSection from "../../../components/reviews/MediaReviewsSection";
import type { ShortFilm } from "./page";

// Role display order — unknown roles sort alphabetically after these
const ROLE_ORDER = [
  "Footballer",
  "Musician",
  "Actor",
  "Athlete",
  "Media Personality",
  "Broadcaster",
];

function groupCredits(credits: Array<{ name: string; role: string }>) {
  const groups = new Map<string, string[]>();
  for (const credit of credits) {
    const names = groups.get(credit.role) ?? [];
    names.push(credit.name);
    groups.set(credit.role, names);
  }
  const known = ROLE_ORDER.filter((r) => groups.has(r));
  const unknown = Array.from(groups.keys()).filter((r) => !ROLE_ORDER.includes(r)).sort();
  return [...known, ...unknown].map((role) => ({ role, names: groups.get(role)! }));
}

function ActionButton({
  children,
  onClick,
  style,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px",
        borderRadius: 10,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 6,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Credits section ──────────────────────────────────────────────────────────

const KNOWN_ROLES = ROLE_ORDER;

function CreditsSection({
  shortFilmId,
  initialCredits,
}: {
  shortFilmId: string;
  initialCredits: Array<{ name: string; role: string }>;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const [isAuthed, setIsAuthed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState(KNOWN_ROLES[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
    });
  }, []);

  const groups = groupCredits(credits);

  async function handleAddCredit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) return;

    setSaving(true);
    setSaveError(null);

    // TODO: Supabase UPDATE policy needed for authenticated users to edit credits
    const supabase = createSupabaseClient();
    if (!supabase) {
      setSaveError("Not configured.");
      setSaving(false);
      return;
    }

    const updated = [...credits, { name: newName.trim(), role: newRole.trim() }];

    const { error } = await supabase
      .from("short_films")
      .update({ credits: updated })
      .eq("id", shortFilmId);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setCredits(updated);
    setNewName("");
    setNewRole(KNOWN_ROLES[0] ?? "");
    setShowForm(false);
    setSaving(false);
  }

  return (
    <section style={{ maxWidth: 680, margin: "32px 0" }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          marginBottom: 16,
        }}
      >
        Credits
      </h2>

      {groups.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.28)",
            fontStyle: "italic",
            margin: "0 0 12px",
          }}
        >
          No credits added yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map(({ role, names }) => (
            <div key={role}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  margin: "0 0 8px",
                }}
              >
                {role}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {names.map((name, i) => (
                  <p
                    key={`${name}-${i}`}
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "rgba(255,255,255,0.72)",
                    }}
                  >
                    {name}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAuthed ? (
        <div style={{ marginTop: 16 }}>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 12,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.02em",
              }}
            >
              + Add credit
            </button>
          ) : (
            <form
              onSubmit={(e) => void handleAddCredit(e)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
                padding: "14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "0.5px solid rgba(255,255,255,0.08)",
              }}
            >
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 14,
                  padding: "6px 0",
                  outline: "none",
                }}
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{
                  background: "#0f0f1e",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 13,
                  padding: "6px 0",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {KNOWN_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {saveError ? (
                <p style={{ margin: 0, fontSize: 12, color: "#fca5a5" }}>{saveError}</p>
              ) : null}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#1D9E75",
                    border: "none",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "7px 14px",
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNewName("");
                    setSaveError(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    borderRadius: 8,
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 12,
                    padding: "7px 14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function ShortFilmDetailClient({
  shortFilm,
}: {
  shortFilm: ShortFilm;
}) {
  const { openLog } = useDiaryLog();
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null);
  const [personalLoaded, setPersonalLoaded] = useState(false);
  const [diaryEntry, setDiaryEntry] = useState<{
    id: string;
    rating: number | null;
    review: string;
    watched_date: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalData() {
      const supabase = createSupabaseClient();
      if (!supabase) {
        if (!cancelled) setPersonalLoaded(true);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setPersonalLoaded(true);
        return;
      }
      const userId = session.user.id;

      const [{ data: entries }, { data: watchlistItems }] = await Promise.all([
        supabase
          .from("diary_entries")
          .select("id, rating, review, watched_date")
          .eq("user_id", userId)
          .eq("media_id", shortFilm.id)
          .eq("media_type", "short_film")
          .eq("review_scope", "show")
          .order("watched_date", { ascending: false })
          .limit(1),
        supabase
          .from("saved_items")
          .select("id, media_id")
          .eq("user_id", userId)
          .eq("list_type", "watchlist")
          .eq("media_type", "short_film")
          .eq("media_id", shortFilm.id),
      ]);

      if (cancelled) return;
      setDiaryEntry(((entries ?? [])[0] as typeof diaryEntry) ?? null);
      setIsWatchlisted((watchlistItems?.length ?? 0) > 0);
      setWatchlistItemId(watchlistItems?.[0]?.id ?? null);
      setPersonalLoaded(true);
    }

    void loadPersonalData();
    return () => { cancelled = true; };
  }, [shortFilm.id]);

  const toggleWatchlist = async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    if (isWatchlisted && watchlistItemId) {
      setIsWatchlisted(false);
      setWatchlistItemId(null);
      const { error } = await supabase.from("saved_items").delete().eq("id", watchlistItemId);
      if (error) {
        console.error("[SHORT FILM] watchlist remove error:", error.message);
        setIsWatchlisted(true);
      }
    } else {
      setIsWatchlisted(true);
      const { data, error } = await supabase
        .from("saved_items")
        .insert({
          user_id: session.user.id,
          list_type: "watchlist",
          media_id: shortFilm.id,
          media_type: "short_film",
          title: shortFilm.title,
          poster: shortFilm.thumbnail_url,
          year: shortFilm.release_year ?? 0,
          creator: shortFilm.channel ?? null,
          genres: shortFilm.genres ?? [],
          runtime: shortFilm.runtime ?? null,
          vote_average: null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[SHORT FILM] watchlist add error:", error.message);
        setIsWatchlisted(false);
      } else {
        setWatchlistItemId(data.id);
      }
    }
  };

  const metaParts = [
    shortFilm.channel,
    shortFilm.source,
    shortFilm.release_year ? String(shortFilm.release_year) : null,
    shortFilm.runtime ? `${shortFilm.runtime}m` : null,
  ].filter(Boolean);

  const contentWrapperStyle: React.CSSProperties = {
    maxWidth: "1020px",
    margin: "0 auto",
    padding: "0 20px 56px",
  };

  return (
    <main style={{ background: "#08080f", minHeight: "100vh", color: "white" }}>
      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          minHeight: "55vh",
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
          background: "#08080f",
        }}
      >
        {shortFilm.thumbnail_url ? (
          <img
            src={shortFilm.thumbnail_url}
            alt={shortFilm.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,8,20,0.3) 0%, rgba(8,8,20,0.1) 30%, rgba(8,8,20,0.7) 65%, rgba(8,8,20,1.0) 100%)",
          }}
        />

        <div
          style={{
            ...contentWrapperStyle,
            position: "relative",
            zIndex: 10,
            width: "100%",
            paddingBottom: 40,
          }}
        >
          <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "rgba(245,158,11,0.18)",
                    border: "0.5px solid rgba(251,191,36,0.35)",
                    color: "rgba(254,243,199,0.92)",
                  }}
                >
                  Short Film
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(26px, 5vw, 36px)",
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {shortFilm.title}
              </h1>

              {metaParts.length > 0 ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  {metaParts.join(" · ")}
                </p>
              ) : null}

              {shortFilm.genres && shortFilm.genres.length > 0 ? (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "capitalize",
                  }}
                >
                  {shortFilm.genres.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div style={contentWrapperStyle}>
        {/* ── Action buttons ── */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: -18,
            marginBottom: 28,
            position: "relative",
            zIndex: 2,
          }}
        >
          <ActionButton
            onClick={() =>
              openLog({
                title: shortFilm.title,
                media_type: "short_film",
                year: shortFilm.release_year ?? 0,
                poster: shortFilm.thumbnail_url,
                creator: shortFilm.channel ?? null,
                runtime: shortFilm.runtime ?? null,
                media_id: shortFilm.id,
              })
            }
            style={{ background: "#1D9E75", color: "white", fontWeight: 600 }}
          >
            <span>＋</span>
            <span>Log this</span>
          </ActionButton>

          <ActionButton
            onClick={() => void toggleWatchlist()}
            style={
              isWatchlisted
                ? {
                    background: "rgba(255,255,255,0.15)",
                    border: "0.5px solid rgba(255,255,255,0.4)",
                    color: "rgba(255,255,255,0.9)",
                  }
                : {
                    background: "rgba(255,255,255,0.08)",
                    border: "0.5px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.82)",
                  }
            }
          >
            <span>{isWatchlisted ? "🔖" : "⌑"}</span>
            <span>{isWatchlisted ? "Watchlisted" : "Watchlist"}</span>
          </ActionButton>
        </div>

        {/* ── Embed + Overview layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: 32,
            alignItems: "start",
          }}
          className="short-film-grid"
        >
          <style>{`
            @media (max-width: 680px) {
              .short-film-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          {/* Left: embed or thumbnail */}
          <div>
            {shortFilm.platform === "youtube" && shortFilm.video_id ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#111122",
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${shortFilm.video_id}`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                  title={shortFilm.title}
                />
              </div>
            ) : shortFilm.thumbnail_url ? (
              <img
                src={shortFilm.thumbnail_url}
                alt={shortFilm.title}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  objectFit: "cover",
                  borderRadius: 12,
                  display: "block",
                }}
              />
            ) : null}

            {shortFilm.external_url ? (
              <p style={{ marginTop: 10, fontSize: 12 }}>
                <a
                  href={shortFilm.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
                >
                  Watch on {shortFilm.source ?? "external site"} ↗
                </a>
              </p>
            ) : null}
          </div>

          {/* Right: personal log status */}
          <div>
            {personalLoaded && diaryEntry ? (
              <div
                style={{
                  borderLeft: "2px solid #1D9E75",
                  paddingLeft: 16,
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 10,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  Your Rating
                </p>
                <p style={{ margin: 0 }}>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.9)",
                      fontSize: 20,
                      fontWeight: 300,
                      letterSpacing: "-0.5px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {(diaryEntry.rating ?? 0).toFixed(1)}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 14,
                      fontWeight: 400,
                      marginLeft: 4,
                    }}
                  >
                    / 10
                  </span>
                </p>
                {diaryEntry.review ? (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.55)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    {diaryEntry.review}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Overview ── */}
        {shortFilm.description ? (
          <section style={{ maxWidth: 680, margin: "32px 0" }}>
            <h2
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                marginBottom: 12,
              }}
            >
              Overview
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.72)",
                margin: 0,
              }}
            >
              {shortFilm.description}
            </p>
          </section>
        ) : null}

        {/* ── Credits ── */}
        <CreditsSection
          shortFilmId={shortFilm.id}
          initialCredits={shortFilm.credits ?? []}
        />

        {/* ── Reviews ── */}
        <MediaReviewsSection
          mediaIds={[shortFilm.id]}
          mediaType="short_film"
          title={shortFilm.title}
          year={shortFilm.release_year ?? 0}
          poster={shortFilm.thumbnail_url}
          creator={shortFilm.channel ?? null}
          href={`/short-films/${shortFilm.id}`}
        />
      </div>
    </main>
  );
}

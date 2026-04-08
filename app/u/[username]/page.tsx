import Link from "next/link";
import { notFound } from "next/navigation";
import FollowProfileButton from "../../../components/FollowProfileButton";
import PublicDiaryEntriesGrid from "../../../components/PublicDiaryEntriesGrid";
import { getIsFollowing } from "../../../lib/follows";
import { createClient } from "../../../lib/supabase/server";
import { getPublicProfileByUsername } from "../../../lib/publicProfiles";
import { getProfileHandle, getProfileInitials } from "../../../lib/profile";

export const dynamic = "force-dynamic";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        color: "#7f7f7f",
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {children}
    </p>
  );
}

function IdentityAvatar({
  avatarUrl,
  label,
  initials,
}: {
  avatarUrl: string | null;
  label: string;
  initials: string;
}) {
  return (
    <div
      style={{
        width: 124,
        height: 124,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.76)",
            fontSize: 34,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function FavouriteCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "16px 18px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#7f7f7f",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          color: "white",
          fontSize: 16,
          lineHeight: 1.45,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  if (!supabase) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const publicProfile = await getPublicProfileByUsername(supabase, username, user?.id);

  if (!publicProfile) {
    notFound();
  }

  const { profile, recentEntries, mountRushmore, counts } = publicProfile;
  const handle = getProfileHandle(profile);
  const identityLabel = profile.displayName || handle || "ReelShelf Profile";
  const identityInitials = getProfileInitials(profile);
  const isOwnProfile = user?.id === profile.id;
  const initialIsFollowing =
    user && !isOwnProfile ? await getIsFollowing(supabase, user.id, profile.id) : false;

  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "20px 0 84px",
      }}
    >
      <style>{`
        .public-profile-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 24px;
          margin-bottom: 24px;
        }

        .public-profile-favourites {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .public-profile-rushmore {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .public-profile-recent {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 980px) {
          .public-profile-hero,
          .public-profile-rushmore,
          .public-profile-recent {
            grid-template-columns: 1fr;
          }

          .public-profile-favourites {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at 85% 18%, rgba(255,255,255,0.06), transparent 22%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
          padding: "34px 34px 30px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          marginBottom: 24,
        }}
      >
        <SectionLabel>Public Profile</SectionLabel>

        <div className="public-profile-hero">
          <div>
            <div
              style={{
                display: "flex",
                gap: 22,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: 6,
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)",
                }}
              >
                <IdentityAvatar
                  avatarUrl={profile.avatarUrl}
                  label={identityLabel}
                  initials={identityInitials}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#9ca3af",
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {handle || "@reelshelf"}
                </p>

                <h1
                  style={{
                    margin: "10px 0 0",
                    fontSize: 62,
                    lineHeight: 0.95,
                    letterSpacing: "-2.6px",
                    fontWeight: 600,
                    maxWidth: 760,
                  }}
                >
                  {identityLabel}
                </h1>

                <p
                  style={{
                    margin: "16px 0 0",
                    color: "#c2c2c2",
                    fontSize: 18,
                    lineHeight: 1.7,
                    maxWidth: 720,
                  }}
                >
                  {profile.bio?.trim()
                    ? profile.bio
                    : "A ReelShelf identity in progress, shaped by films, series, books, and the logs that define a taste."}
                </p>
              </div>
            </div>

            <div className="public-profile-favourites">
              <FavouriteCard
                label="Favourite Film"
                value={profile.favouriteFilm || "Not shared yet"}
              />
              <FavouriteCard
                label="Favourite Series"
                value={profile.favouriteSeries || "Not shared yet"}
              />
              <FavouriteCard
                label="Favourite Book"
                value={profile.favouriteBook || "Not shared yet"}
              />
            </div>
          </div>

          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              padding: 22,
            }}
          >
            <SectionLabel>Shareable Shelf</SectionLabel>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.8px",
              }}
            >
              A public-facing taste snapshot
            </h2>
            <p
              style={{
                margin: 0,
                color: "#c7c7c7",
                fontSize: 15,
                lineHeight: 1.75,
                fontFamily: "Arial, sans-serif",
              }}
            >
              This page gathers the identity details and diary activity tied to
              @{profile.username}, turning a private ReelShelf account into a
              shareable public profile.
            </p>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 12,
              }}
            >
              <FollowProfileButton
                targetUserId={profile.id}
                initialIsFollowing={initialIsFollowing}
                initialFollowerCount={counts.followers}
                initialFollowingCount={counts.following}
                isOwnProfile={Boolean(isOwnProfile)}
              />

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7f7f7f",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Recent Diary Entries
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "white",
                    fontSize: 16,
                    lineHeight: 1.45,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {recentEntries.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <SectionLabel>Movie Mount Rushmore</SectionLabel>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.9px",
          }}
        >
          Four films that define this shelf
        </h2>

        {mountRushmore.length > 0 ? (
          <div className="public-profile-rushmore">
            {mountRushmore.map((entry) => (
              <Link
                key={`${entry.mediaType}-${entry.id}`}
                href={entry.href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  style={{
                    borderRadius: 20,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "2 / 3",
                      background:
                        "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                    }}
                  >
                    {entry.poster ? (
                      <img
                        src={entry.poster}
                        alt={entry.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 46%, rgba(0,0,0,0.06) 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(0,0,0,0.45)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "white",
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {typeof entry.rating === "number"
                        ? `${entry.rating.toFixed(1)} ★`
                        : "FILM"}
                    </div>
                  </div>

                  <div style={{ padding: 14 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 18,
                        lineHeight: 1.2,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {entry.title}
                    </h3>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#9ca3af",
                        fontSize: 13,
                        lineHeight: 1.55,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {entry.year}
                      {entry.creator ? ` · ${entry.creator}` : ""}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              color: "#bdbdbd",
              fontSize: 15,
              lineHeight: 1.7,
              fontFamily: "Arial, sans-serif",
            }}
          >
            No films have been logged publicly yet for this profile.
          </p>
        )}
      </section>

      <section
        style={{
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
          padding: 24,
        }}
      >
        <SectionLabel>Recent Diary Entries</SectionLabel>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.9px",
          }}
        >
          Latest logs from this shelf
        </h2>

        {recentEntries.length > 0 ? (
          <PublicDiaryEntriesGrid entries={recentEntries} ownerUserId={profile.id} />
        ) : (
          <p
            style={{
              margin: 0,
              color: "#bdbdbd",
              fontSize: 15,
              lineHeight: 1.7,
              fontFamily: "Arial, sans-serif",
            }}
          >
            No public diary entries are available for this profile yet.
          </p>
        )}
      </section>
    </main>
  );
}

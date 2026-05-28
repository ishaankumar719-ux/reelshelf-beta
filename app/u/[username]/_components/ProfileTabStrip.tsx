import Link from "next/link"

export type ProfileTab = "films" | "series" | "reviews" | "watchlist" | "followers" | "following"

const TABS: { key: ProfileTab; label: string }[] = [
  { key: "films",     label: "Films"     },
  { key: "series",    label: "Series"    },
  { key: "reviews",   label: "Reviews"   },
  { key: "watchlist", label: "Watchlist" },
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
]

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

export default function ProfileTabStrip({
  username,
  activeTab,
}: {
  username: string
  activeTab: ProfileTab
}) {
  return (
    <>
      <style>{`
        .pf-tab-strip {
          display: flex;
          gap: 2px;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          margin: 0 0 28px;
          padding-bottom: 2px;
          border-bottom: 0.5px solid rgba(255,255,255,0.07);
        }
        .pf-tab-strip::-webkit-scrollbar { display: none; }
        .pf-tab-item {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          padding: 8px 14px;
          border-radius: 8px 8px 0 0;
          font-family: ${FONT};
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.12s ease, background 0.12s ease;
          color: rgba(255,255,255,0.38);
          background: transparent;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        .pf-tab-item:hover {
          color: rgba(255,255,255,0.62);
          background: rgba(255,255,255,0.04);
        }
        .pf-tab-item[aria-current="page"] {
          color: rgba(255,255,255,0.88);
          border-bottom-color: rgba(255,255,255,0.55);
          background: rgba(255,255,255,0.04);
        }
        @media (max-width: 520px) {
          .pf-tab-item { font-size: 12px; padding: 8px 12px; }
        }
      `}</style>
      <nav aria-label="Profile sections" className="pf-tab-strip">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/u/${username}/${tab.key}`}
            className="pf-tab-item"
            aria-current={activeTab === tab.key ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

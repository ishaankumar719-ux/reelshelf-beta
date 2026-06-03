import { getProviderSearchUrl } from "../utils/providers";

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

const PRIORITY_ORDER = [
  "Netflix",
  "Prime Video",
  "Disney+",
  "Apple TV+",
  "BBC iPlayer",
  "NOW",
  "Paramount+",
];

function sortByPriority(providers: WatchProvider[]): WatchProvider[] {
  return [...providers].sort((a, b) => {
    const ai = PRIORITY_ORDER.findIndex((s) => a.provider_name.includes(s));
    const bi = PRIORITY_ORDER.findIndex((s) => b.provider_name.includes(s));
    const aRank = ai === -1 ? PRIORITY_ORDER.length : ai;
    const bRank = bi === -1 ? PRIORITY_ORDER.length : bi;
    return aRank - bRank;
  });
}

export function WhereToWatch({
  providers,
  title,
}: {
  providers: WatchProvider[];
  title: string;
}) {
  const sorted = sortByPriority(providers);

  return (
    <div style={{ marginTop: 24, marginBottom: 4 }}>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        Where To Watch
      </p>

      {sorted.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.28)" }}>
          Streaming information unavailable
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {sorted.map((provider) => (
            <a
              key={provider.provider_id}
              href={getProviderSearchUrl(provider.provider_name, title)}
              target="_blank"
              rel="noopener noreferrer"
              title={provider.provider_name}
              className="block rounded-[10px] overflow-hidden transition-transform duration-200 hover:scale-105 hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                alt={provider.provider_name}
                width={44}
                height={44}
                style={{ display: "block", width: 44, height: 44, objectFit: "cover" }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

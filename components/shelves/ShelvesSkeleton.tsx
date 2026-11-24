export default function ShelvesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading shelves">
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ marginBottom: 26 }}>
          <div style={{ width: 160, height: 16, borderRadius: 4, background: "rgba(255,255,255,.07)", margin: "0 4px 32px" }} />
          <div style={{ height: 206, borderRadius: 6, background: "linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.07), rgba(255,255,255,.04))" }} />
        </div>
      ))}
    </div>
  );
}

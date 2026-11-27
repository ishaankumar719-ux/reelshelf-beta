"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { posterAt, type Shelf, type ShelfItem, type Visibility } from "../../lib/shelves";
import CoverStage, { type Rect } from "./CoverStage";

/* ───────────────────────── geometry ───────────────────────── */

const PAD_X = 20;
const GAP = 5;
const HEADROOM = 26; // room above the spines for the hover lift
const VIRTUAL_FROM = 60; // render only nearby spines on shelves longer than this

type Metrics = { spineH: number };
const METRICS: Record<"compact" | "wide", Metrics> = {
  compact: { spineH: 196 },
  wide: { spineH: 232 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const spineWidth = (key: string) => 40 + (hash(key) % 3) * 6; // 40 / 46 / 52
const spineHeightPct = (key: string) => 0.9 + ((hash(key) >> 3) % 11) / 100; // 90–100%

type Geo = { lefts: number[]; widths: number[]; width: number };
function layout(items: ShelfItem[], density: number): Geo {
  const lefts: number[] = [];
  const widths: number[] = [];
  const gap = Math.max(2, Math.round(GAP * density));
  let x = PAD_X;
  for (const it of items) {
    const w = Math.round(spineWidth(it.key) * density);
    lefts.push(x);
    widths.push(w);
    x += w + gap;
  }
  return { lefts, widths, width: x - gap + PAD_X };
}
/** First index whose spine ends after x. */
function firstAfter(geo: Geo, x: number) {
  let lo = 0;
  let hi = geo.lefts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (geo.lefts[mid] + geo.widths[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const MEDIA_LABEL: Record<string, string> = { movie: "Film", tv: "Series", book: "Book", short_film: "Short" };
const VIS_LABEL: Record<Visibility, string> = { public: "Public", unlisted: "Unlisted", private: "Private" };

/* ───────────────────────── hooks ───────────────────────── */

function useMedia(query: string, initial = false) {
  const [match, setMatch] = useState(initial);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/* spine density: −/+ buttons, trackpad pinch (ctrl + wheel) or a two-finger pinch on a shelf */
const DENSITIES = [0.7, 0.85, 1, 1.2];
const DENSITY_KEY = "reelshelf.shelves.density";
function useDensity(): [number, (i: number) => void] {
  const [i, setI] = useState(2);
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(DENSITY_KEY));
      if (Number.isInteger(n) && n >= 0 && n < DENSITIES.length && localStorage.getItem(DENSITY_KEY) != null) setI(n);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const set = useCallback((n: number) => {
    const next = Math.max(0, Math.min(DENSITIES.length - 1, n));
    setI(next);
    try {
      localStorage.setItem(DENSITY_KEY, String(next));
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [i, set];
}

/* ───────────────────────── cover (no flashing) ───────────────────────── */

/**
 * Shows the small spine artwork (already loaded) straight away, then fades the sharper
 * cover in once it has decoded, so the right picture is always on screen and nothing flashes.
 */
function CoverArt({ src, low, title }: { src: string | null; low?: string | null; title: string }) {
  const [ready, setReady] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    const img = new Image();
    img.src = src;
    if (img.complete && img.naturalWidth) setReady(src);
    else img.decode().then(() => live && setReady(src), () => live && setFailed(src));
    return () => {
      live = false;
    };
  }, [src]);
  if (!src && !low) {
    return (
      <div className="sb-cover-fallback" style={{ background: fallbackBg(title) }}>
        <span>{title}</span>
      </div>
    );
  }
  return (
    <>
      {low ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sb-art-low" src={low} alt="" draggable={false} />
      ) : (
        <div className="sb-cover-fallback" style={{ background: fallbackBg(title) }}>
          <span>{title}</span>
        </div>
      )}
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={`sb-art-high${ready === src ? " is-ready" : ""}`} src={src} alt="" draggable={false} />
      ) : null}
    </>
  );
}

function fallbackBg(seed: string) {
  const h = hash(seed) % 360;
  return `linear-gradient(160deg, hsl(${h} 28% 26%), hsl(${(h + 40) % 360} 30% 12%))`;
}

/* ───────────────────────── spine ───────────────────────── */

type SpineProps = {
  item: ShelfItem;
  index: number;
  left: number;
  width: number;
  height: number;
  out: boolean;
  tabbable: boolean;
  editing: boolean;
  total: number;
  onOpen: (index: number) => void;
  onKey: (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => void;
  onFocusSpine: (index: number) => void;
  dragging?: boolean;
  onDragStart?: (e: React.PointerEvent<HTMLButtonElement>, index: number) => void;
};

const Spine = memo(function Spine({ item, index, left, width, height, out, tabbable, editing, total, onOpen, onKey, onFocusSpine, dragging, onDragStart }: SpineProps) {
  const [broken, setBroken] = useState(false);
  const thumb = posterAt(item.poster, "w154");
  const len = item.title.length;
  const fs = width < 34 ? 10 : len <= 18 ? 12 : len <= 32 ? 11 : 10;
  const h = Math.round(height * spineHeightPct(item.key));
  return (
    <button
      type="button"
      role="option"
      aria-selected={out}
      aria-label={`${item.title}${item.year ? `, ${item.year}` : ""}. ${index + 1} of ${total}`}
      tabIndex={tabbable ? 0 : -1}
      data-index={index}
      className={`sb-spine${out && !dragging ? " is-out" : ""}${editing ? " is-editing" : ""}${dragging ? " is-dragging" : ""}`}
      style={{ left, width, height: h, top: HEADROOM + (height - h) }}
      aria-roledescription={editing ? "Draggable title" : undefined}
      onPointerDown={editing && onDragStart ? (e) => onDragStart(e, index) : undefined}
      onClick={() => onOpen(index)}
      onFocus={() => onFocusSpine(index)}
      onKeyDown={(e) => onKey(e, index)}
    >
      {thumb && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} />
      ) : (
        <span className="sb-spine-bg" style={{ background: fallbackBg(item.title) }} />
      )}
      <span className="sb-spine-shade" />
      <span className="sb-spine-title" style={{ fontSize: fs }}>
        {item.title}
      </span>
      {item.rank != null ? <span className="sb-spine-rank">{item.rank}</span> : item.year ? <span className="sb-spine-year">{item.year.slice(-2)}</span> : null}
    </button>
  );
});

/* ───────────────────────── shelf row ───────────────────────── */

type RowProps = {
  shelf: Shelf;
  shelfIndex: number;
  metrics: Metrics;
  density: number;
  outKey: string | null;
  focusIndex: number;
  editing: boolean;
  canEdit: boolean;
  wide: boolean;
  reduced: boolean;
  setTrackEl: (el: HTMLDivElement | null) => void;
  setSectionEl: (el: HTMLElement | null) => void;
  onOpen: (shelfIndex: number, index: number, rectFor: (key: string) => Rect | null) => void;
  onKey: (e: ReactKeyboardEvent<HTMLButtonElement>, shelfIndex: number, index: number) => void;
  onFocusSpine: (shelfIndex: number, index: number) => void;
  onToggleEdit: () => void;
  onVisibility: (v: Visibility) => void;
  onDragReorder: (shelfIndex: number, from: number, to: number) => void;
  onDensityStep: (dir: number, shelfId: string, focalX: number) => void;
};

type DragState = { from: number; to: number; dx: number; startScroll: number; scroll: number };

function moved<T>(arr: T[], from: number, to: number) {
  if (from === to) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function ShelfRow(p: RowProps) {
  const { shelf, metrics, density, setSectionEl, setTrackEl } = p;
  const trackEl = useRef<HTMLDivElement | null>(null);
  // Latest props for event handlers; set after each render (handlers only run after mount).
  const pRef = useRef<RowProps>(null as unknown as RowProps);
  useLayoutEffect(() => {
    pRef.current = p;
  });

  /* ── drag to reorder (Arrange mode only) ──
     Mouse: press and move. Touch: hold briefly, then move — a quick swipe still
     scrolls the shelf. The other spines slide aside to show where it will land;
     holding near either end keeps the shelf scrolling. */
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const baseGeo = useMemo(() => layout(shelf.items, density), [shelf.items, density]);
  const geoRef = useRef(baseGeo);
  useLayoutEffect(() => {
    geoRef.current = baseGeo;
  }, [baseGeo]);
  const order = useMemo(() => (drag ? moved(shelf.items, drag.from, drag.to) : shelf.items), [shelf.items, drag]);
  const geo = useMemo(() => (drag ? layout(order, density) : baseGeo), [drag, order, baseGeo, density]);

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
      if (e.button !== 0) return;
      const track = trackEl.current;
      if (!track) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const touch = e.pointerType !== "mouse";
      let active = false;
      let timer = 0;
      let raf = 0;
      let lastX = startX;

      const targetFor = (clientX: number) => {
        const rect = track.getBoundingClientRect();
        const x = clientX - rect.left + track.scrollLeft;
        const g = geoRef.current;
        const rest = g.lefts.map((l, i) => ({ c: l + g.widths[i] / 2, i })).filter((s) => s.i !== index);
        let to = rest.findIndex((s) => s.c > x);
        if (to === -1) to = rest.length;
        return to;
      };
      const update = () => {
        const st: DragState = {
          from: index,
          to: targetFor(lastX),
          dx: lastX - startX,
          startScroll: dragRef.current?.startScroll ?? track.scrollLeft,
          scroll: track.scrollLeft,
        };
        dragRef.current = st;
        setDrag(st);
      };
      const edgeScroll = () => {
        const rect = track.getBoundingClientRect();
        const edge = 48;
        let v = 0;
        if (lastX < rect.left + edge) v = -Math.ceil((rect.left + edge - lastX) / 6);
        else if (lastX > rect.right - edge) v = Math.ceil((lastX - (rect.right - edge)) / 6);
        if (v) {
          track.scrollLeft += v;
          update();
        }
        raf = requestAnimationFrame(edgeScroll);
      };
      const activate = () => {
        active = true;
        suppressClick.current = true;
        try {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        update();
        raf = requestAnimationFrame(edgeScroll);
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        lastX = ev.clientX;
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (!active) {
          if (touch) {
            if (dist > 8) cleanup(); // it's a scroll, not a drag
          } else if (dist > 6) activate();
          return;
        }
        update();
      };
      const onTouchMove = (ev: TouchEvent) => {
        if (active) ev.preventDefault();
      };
      const finish = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const st = dragRef.current;
        cleanup();
        if (active && st && st.to !== st.from) pRef.current.onDragReorder(pRef.current.shelfIndex, st.from, st.to);
        // Let the click that follows a drag through to nothing.
        setTimeout(() => (suppressClick.current = false), 0);
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        track.removeEventListener("touchmove", onTouchMove);
        dragRef.current = null;
        setDrag(null);
        if (!active) suppressClick.current = false;
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      track.addEventListener("touchmove", onTouchMove, { passive: false });
      if (touch) timer = window.setTimeout(activate, 240);
    },
    []
  );

  /* ── long shelves only render the spines near the visible part ── */
  const [edges, setEdges] = useState({ start: true, end: false });
  const [view, setView] = useState({ x: 0, w: 1200 });
  const onScroll = useCallback(() => {
    const t = trackEl.current;
    if (!t) return;
    const bucket = Math.floor(t.scrollLeft / 400) * 400;
    setView((v) => (v.x === bucket && v.w === t.clientWidth ? v : { x: bucket, w: t.clientWidth }));
    setEdges({ start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth > t.scrollWidth - 4 });
  }, []);
  const range = useMemo<[number, number]>(() => {
    const n = shelf.items.length;
    if (n <= VIRTUAL_FROM) return [0, n - 1];
    return [firstAfter(baseGeo, view.x - view.w), Math.min(n - 1, firstAfter(baseGeo, view.x + 400 + 2 * view.w))];
  }, [shelf.items.length, baseGeo, view]);

  useEffect(onScroll, [onScroll, geo.width]);

  /* ── pinch to change density: trackpad (ctrl + wheel) or two fingers ── */
  useEffect(() => {
    const t = trackEl.current;
    if (!t) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault(); // otherwise the browser zooms the page
      acc += e.deltaY;
      if (Math.abs(acc) < 40) return;
      const dir = acc < 0 ? 1 : -1;
      acc = 0;
      pRef.current.onDensityStep(dir, shelf.id, e.clientX - t.getBoundingClientRect().left);
    };
    let base = 0;
    let applied = 0;
    const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        base = dist(e);
        applied = 0;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !base) return;
      e.preventDefault();
      const steps = Math.round(Math.log(dist(e) / base) / Math.log(1.25));
      if (steps !== applied) {
        const dir = steps > applied ? 1 : -1;
        applied = steps;
        const mid = (e.touches[0].clientX + e.touches[1].clientX) / 2 - t.getBoundingClientRect().left;
        pRef.current.onDensityStep(dir, shelf.id, mid);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) base = 0;
    };
    t.addEventListener("wheel", onWheel, { passive: false });
    t.addEventListener("touchstart", onTouchStart, { passive: true });
    t.addEventListener("touchmove", onTouchMove, { passive: false });
    t.addEventListener("touchend", onTouchEnd);
    t.addEventListener("touchcancel", onTouchEnd);
    return () => {
      t.removeEventListener("wheel", onWheel);
      t.removeEventListener("touchstart", onTouchStart);
      t.removeEventListener("touchmove", onTouchMove);
      t.removeEventListener("touchend", onTouchEnd);
      t.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [shelf.id, shelf.items.length]);

  const page = (dir: number) => {
    const t = trackEl.current;
    if (!t) return;
    t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: p.reduced ? "auto" : "smooth" });
  };

  /* ── open: where every spine is on screen right now, for the flight out and back ── */
  const open = useCallback((i: number) => {
    if (suppressClick.current) return;
    const t = trackEl.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const sx = t.scrollLeft;
    const P = pRef.current;
    const items = () => pRef.current.shelf.items;
    const rectFor = (k: string): Rect | null => {
      const idx = items().findIndex((it) => it.key === k);
      const g = geoRef.current;
      if (idx < 0 || g.lefts[idx] == null) return null;
      const x = r.left + g.lefts[idx] - sx;
      const w = g.widths[idx];
      if (x + w < r.left + 2 || x > r.right - 2) return null;
      const h = Math.round(P.metrics.spineH * spineHeightPct(k));
      return { x, y: r.top + HEADROOM + (P.metrics.spineH - h), w, h };
    };
    P.onOpen(P.shelfIndex, i, rectFor);
  }, []);
  const onKey = useCallback((e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => pRef.current.onKey(e, pRef.current.shelfIndex, i), []);
  const onFocusSpine = useCallback((i: number) => pRef.current.onFocusSpine(pRef.current.shelfIndex, i), []);

  return (
    <section className="sb-shelf" ref={setSectionEl} aria-labelledby={`sb-h-${shelf.id}`}>
      <header className="sb-head">
        <div>
          <h2 id={`sb-h-${shelf.id}`}>{shelf.listHref ? <Link href={shelf.listHref}>{shelf.title}</Link> : shelf.title}</h2>
          <p>
            {shelf.items.length} {shelf.items.length === 1 ? "title" : "titles"}
            {shelf.ranked ? " · Ranked" : ""}
            {!p.canEdit ? null : <> · {VIS_LABEL[shelf.visibility]}</>}
          </p>
        </div>
        {p.canEdit ? (
          <div className="sb-head-actions">
            <label className="sb-select">
              <span className="sb-sr">Who can see {shelf.title}</span>
              <select value={shelf.visibility} onChange={(e) => p.onVisibility(e.target.value as Visibility)}>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </label>
            {shelf.visibility === "unlisted" && shelf.shareUrl ? (
              <button
                type="button"
                className="sb-chip"
                onClick={() => navigator.clipboard?.writeText(new URL(shelf.shareUrl!, window.location.origin).toString())}
              >
                Copy link
              </button>
            ) : null}
            {shelf.items.length > 1 ? (
              <button type="button" className={`sb-chip${p.editing ? " is-on" : ""}`} aria-pressed={p.editing} onClick={p.onToggleEdit}>
                {p.editing ? "Done" : "Arrange"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {p.editing ? (
        <p className="sb-edit-hint">Drag a title to move it, or open it and use the Move buttons (Alt + ← / → on a keyboard).</p>
      ) : null}
      {shelf.items.length === 0 ? (
        <p className="sb-empty">Nothing here yet.</p>
      ) : (
        <div className="sb-track-wrap" style={{ height: metrics.spineH + HEADROOM + 14 }}>
          <div
            className="sb-track"
            role="listbox"
            aria-label={shelf.title}
            aria-orientation="horizontal"
            ref={(el) => {
              trackEl.current = el;
              setTrackEl(el);
            }}
            onScroll={onScroll}
          >
            <div className="sb-track-inner" style={{ width: geo.width, height: metrics.spineH + HEADROOM + 14 }}>
              {shelf.items.map((it, i) => {
                const isDragged = drag?.from === i;
                if (!isDragged && i !== p.focusIndex && (i < range[0] || i > range[1])) return null;
                const slot = drag ? order.indexOf(it) : i;
                const left = isDragged ? baseGeo.lefts[i] + drag!.dx + (drag!.scroll - drag!.startScroll) : geo.lefts[slot];
                return (
                  <Spine
                    key={it.key}
                    item={it}
                    index={i}
                    left={left}
                    width={baseGeo.widths[i]}
                    height={metrics.spineH}
                    out={p.outKey === it.key}
                    tabbable={p.focusIndex === i}
                    editing={p.editing}
                    total={shelf.items.length}
                    dragging={isDragged}
                    onDragStart={onDragStart}
                    onOpen={open}
                    onKey={onKey}
                    onFocusSpine={onFocusSpine}
                  />
                );
              })}
              <div className="sb-plank" style={{ top: HEADROOM + metrics.spineH, width: geo.width }} />
            </div>
          </div>
          {p.wide ? (
            <>
              <button type="button" className="sb-page sb-page-l" aria-label={`Scroll ${shelf.title} left`} hidden={edges.start} onClick={() => page(-1)}>
                ‹
              </button>
              <button type="button" className="sb-page sb-page-r" aria-label={`Scroll ${shelf.title} right`} hidden={edges.end} onClick={() => page(1)}>
                ›
              </button>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── browser ───────────────────────── */

type Stage = { shelfId: string; startKey: string; key: string; rectFor: (key: string) => Rect | null } | null;

export type ShelfBrowserProps = {
  shelves: Shelf[];
  canEdit: boolean;
  storageKey: string;
  onReorder?: (shelf: Shelf, items: ShelfItem[]) => void;
  onVisibility?: (shelf: Shelf, v: Visibility) => void;
};

export default function ShelfBrowser({ shelves, canEdit, storageKey, onReorder, onVisibility }: ShelfBrowserProps) {
  const router = useRouter();
  const wide = useMedia("(min-width: 900px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const metrics = METRICS[wide ? "wide" : "compact"];
  const [dIndex, setDIndex] = useDensity();
  const density = DENSITIES[dIndex];

  const [stage, setStage] = useState<Stage>(null);
  const [focus, setFocus] = useState<{ shelfId: string; index: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"shelf" | "grid" | "list">("shelf");
  const [announce, setAnnounce] = useState("");

  const tracks = useRef<Map<string, HTMLDivElement>>(new Map());
  const sections = useRef<Map<string, HTMLElement>>(new Map());

  /* keep a spine in view, horizontally only */
  const revealSpine = useCallback(
    (shelfId: string, index: number) => {
      const track = tracks.current.get(shelfId);
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!track || !shelf) return;
      const g = layout(shelf.items, density);
      const l = g.lefts[index] - 24;
      const r = g.lefts[index] + g.widths[index] + 24;
      if (l < track.scrollLeft) track.scrollTo({ left: Math.max(0, l), behavior: reduced ? "auto" : "smooth" });
      else if (r > track.scrollLeft + track.clientWidth) track.scrollTo({ left: r - track.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [shelves, density, reduced]
  );

  const focusSpine = useCallback((shelfId: string, index: number) => {
    setFocus({ shelfId, index });
    requestAnimationFrame(() => tracks.current.get(shelfId)?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus({ preventScroll: true }));
  }, []);

  const onOpen = useCallback(
    (shelfIndex: number, index: number, rectFor: (key: string) => Rect | null) => {
      const shelf = shelves[shelfIndex];
      const item = shelf?.items[index];
      if (!item) return;
      setFocus({ shelfId: shelf.id, index });
      setStage((cur) => cur ?? { shelfId: shelf.id, startKey: item.key, key: item.key, rectFor });
    },
    [shelves]
  );

  /* reorder (explicit Arrange mode only) */
  const moveKey = useCallback(
    (shelfId: string, key: string, delta: number) => {
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!shelf || !onReorder) return;
      const from = shelf.items.findIndex((i) => i.key === key);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= shelf.items.length) return;
      const next = [...shelf.items];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      onReorder(shelf, next);
      setAnnounce(`Moved ${it.title} to position ${to + 1}.`);
      return to;
    },
    [shelves, onReorder]
  );

  const onDragReorder = useCallback(
    (shelfIndex: number, from: number, to: number) => {
      const shelf = shelves[shelfIndex];
      if (!shelf || !onReorder) return;
      const next = [...shelf.items];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      onReorder(shelf, next);
      setAnnounce(`Moved ${it.title} to position ${to + 1}.`);
    },
    [shelves, onReorder]
  );

  /* keyboard on the shelves: arrows move between titles, Enter opens the cover */
  const onKey = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, shelfIndex: number, index: number) => {
      const shelf = shelves[shelfIndex];
      const editing = editingId === shelf.id;
      const go = (si: number, i: number) => {
        e.preventDefault();
        const s = shelves[si];
        if (!s || !s.items.length) return;
        const n = Math.max(0, Math.min(s.items.length - 1, i));
        revealSpine(s.id, n);
        focusSpine(s.id, n);
        setAnnounce(`${s.items[n].title}. ${n + 1} of ${s.items.length} in ${s.title}.`);
      };
      if (editing && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const to = moveKey(shelf.id, shelf.items[index].key, e.key === "ArrowLeft" ? -1 : 1);
        if (to != null) {
          revealSpine(shelf.id, to);
          focusSpine(shelf.id, to);
        }
        return;
      }
      switch (e.key) {
        case "ArrowRight":
          return go(shelfIndex, index + 1);
        case "ArrowLeft":
          return go(shelfIndex, index - 1);
        case "Home":
          return go(shelfIndex, 0);
        case "End":
          return go(shelfIndex, shelf.items.length - 1);
        case "ArrowDown":
        case "ArrowUp": {
          const step = e.key === "ArrowDown" ? 1 : -1;
          let si = shelfIndex + step;
          while (shelves[si] && !shelves[si].items.length) si += step;
          if (!shelves[si]) return;
          return go(si, Math.min(index, shelves[si].items.length - 1));
        }
      }
    },
    [shelves, editingId, revealSpine, focusSpine, moveKey]
  );
  const onFocusSpine = useCallback((shelfIndex: number, index: number) => {
    const s = shelves[shelfIndex];
    if (s) setFocus((cur) => (cur?.shelfId === s.id && cur.index === index ? cur : { shelfId: s.id, index }));
  }, [shelves]);

  /* density: keep the spine under the pinch where it is; other shelves keep their place proportionally */
  const pendingScroll = useRef<Map<string, number> | null>(null);
  // Spines snap to their new size (no sliding) so the one under the pinch stays put.
  const [snap, setSnap] = useState(false);
  const snapTimer = useRef(0);
  const changeDensity = useCallback(
    (next: number, pinned?: { shelfId: string; focalX: number }) => {
      const n = Math.max(0, Math.min(DENSITIES.length - 1, next));
      if (n === dIndex) return;
      const ratio = DENSITIES[n] / DENSITIES[dIndex];
      const m = new Map<string, number>();
      tracks.current.forEach((t, id) => {
        const focal = pinned?.shelfId === id ? pinned.focalX : 0;
        m.set(id, Math.max(0, PAD_X + (t.scrollLeft + focal - PAD_X) * ratio - focal));
      });
      pendingScroll.current = m;
      setSnap(true);
      window.clearTimeout(snapTimer.current);
      snapTimer.current = window.setTimeout(() => setSnap(false), 320);
      setDIndex(n);
      setAnnounce(n < dIndex ? "More titles per shelf." : "Fewer titles per shelf.");
    },
    [dIndex, setDIndex]
  );
  useLayoutEffect(() => {
    const m = pendingScroll.current;
    if (!m) return;
    pendingScroll.current = null;
    m.forEach((x, id) => {
      const t = tracks.current.get(id);
      if (t) t.scrollLeft = x;
    });
  }, [density]);
  const onDensityStep = useCallback((dir: number, shelfId: string, focalX: number) => changeDensity(dIndex + dir, { shelfId, focalX }), [changeDensity, dIndex]);

  /* scroll memory: rows and page offset survive a trip to a title page */
  const save = useCallback(() => {
    try {
      const rows: Record<string, number> = {};
      tracks.current.forEach((el, id) => (rows[id] = el.scrollLeft));
      sessionStorage.setItem(storageKey, JSON.stringify({ rows, y: window.scrollY, view }));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, view]);

  const restored = useRef(false);
  useLayoutEffect(() => {
    if (restored.current || !shelves.length) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw) as { rows: Record<string, number>; y: number; view?: typeof view };
      if (s.view) setView(s.view);
      Object.entries(s.rows ?? {}).forEach(([id, x]) => {
        const el = tracks.current.get(id);
        if (el) el.scrollLeft = x;
      });
      requestAnimationFrame(() => window.scrollTo({ top: s.y ?? 0, behavior: "auto" }));
    } catch {
      /* ignore */
    }
  }, [shelves, storageKey]);

  useEffect(() => {
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [save]);

  function openItem(item: ShelfItem) {
    save();
    router.push(item.href);
  }

  const stageShelf = stage ? shelves.find((s) => s.id === stage.shelfId) ?? null : null;

  return (
    <div className={`sb${reduced ? " is-reduced" : ""}${snap ? " is-snap" : ""}`}>
      <style>{CSS}</style>
      <div className="sb-bar">
        <div className="sb-toolbar" role="group" aria-label="View">
          {(["shelf", "grid", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} className={`sb-seg${view === v ? " is-on" : ""}`} onClick={() => setView(v)}>
              {v === "shelf" ? "Shelf" : v === "grid" ? "Grid" : "List"}
            </button>
          ))}
        </div>
        {view === "shelf" ? (
          <div className="sb-density" role="group" aria-label="Spine size">
            <button type="button" className="sb-dbtn" aria-label="Fit more titles on each shelf" disabled={dIndex === 0} onClick={() => changeDensity(dIndex - 1)}>
              −
            </button>
            <button type="button" className="sb-dbtn" aria-label="Show bigger spines" disabled={dIndex === DENSITIES.length - 1} onClick={() => changeDensity(dIndex + 1)}>
              +
            </button>
          </div>
        ) : null}
      </div>

      {view !== "shelf" ? (
        <FlatViews shelves={shelves} view={view} onOpen={openItem} />
      ) : (
        <div className="sb-main">
          {shelves.map((shelf, si) => (
            <ShelfRow
              key={shelf.id}
              shelf={shelf}
              shelfIndex={si}
              metrics={metrics}
              density={density}
              outKey={stage?.shelfId === shelf.id ? stage.key : null}
              focusIndex={focus?.shelfId === shelf.id ? Math.min(focus.index, shelf.items.length - 1) : si === 0 && !focus ? 0 : -1}
              editing={editingId === shelf.id}
              canEdit={canEdit}
              wide={wide}
              reduced={reduced}
              setTrackEl={(el) => (el ? tracks.current.set(shelf.id, el) : tracks.current.delete(shelf.id))}
              setSectionEl={(el) => (el ? sections.current.set(shelf.id, el) : sections.current.delete(shelf.id))}
              onOpen={onOpen}
              onKey={onKey}
              onFocusSpine={onFocusSpine}
              onToggleEdit={() => setEditingId((cur) => (cur === shelf.id ? null : shelf.id))}
              onDragReorder={onDragReorder}
              onVisibility={(v) => onVisibility?.(shelf, v)}
              onDensityStep={onDensityStep}
            />
          ))}
        </div>
      )}

      {stage && stageShelf ? (
        <CoverStage
          key={`${stage.shelfId}:${stage.startKey}`}
          shelf={stageShelf}
          startKey={stage.startKey}
          spineRect={stage.rectFor}
          reduced={reduced}
          canEdit={canEdit}
          editing={editingId === stage.shelfId}
          onKeyChange={(k) => {
            setStage((cur) => (cur ? { ...cur, key: k } : cur));
            const i = stageShelf.items.findIndex((it) => it.key === k);
            if (i >= 0) setFocus({ shelfId: stageShelf.id, index: i });
          }}
          onMove={(k, d) => moveKey(stageShelf.id, k, d)}
          onOpenTitle={(it) => {
            setStage(null);
            openItem(it);
          }}
          onClosed={(k) => {
            setStage(null);
            const i = stageShelf.items.findIndex((it) => it.key === k);
            if (i >= 0) focusSpine(stageShelf.id, i);
          }}
        />
      ) : null}

      <div className="sb-sr" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}

/* ───────────────────────── grid & list ───────────────────────── */

function FlatViews({ shelves, view, onOpen }: { shelves: Shelf[]; view: "grid" | "list"; onOpen: (i: ShelfItem) => void }) {
  return (
    <div className="sb-flat">
      {shelves.map((s) => (
        <section key={s.id} className="sb-flat-shelf" aria-labelledby={`sbf-${s.id}`}>
          <header className="sb-head">
            <div>
              <h2 id={`sbf-${s.id}`}>{s.title}</h2>
              <p>
                {s.items.length} {s.items.length === 1 ? "title" : "titles"}
              </p>
            </div>
          </header>
          {view === "grid" ? (
            <ul className="sb-grid">
              {s.items.map((it) => (
                <li key={it.key}>
                  <a
                    href={it.href}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpen(it);
                    }}
                  >
                    <span className="sb-grid-art">
                      <CoverArt src={posterAt(it.poster, "w185")} title={it.title} />
                    </span>
                    <span className="sb-grid-title">{it.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="sb-list">
              {s.items.map((it, i) => (
                <li key={it.key}>
                  <a
                    href={it.href}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpen(it);
                    }}
                  >
                    <span className="sb-list-n">{it.rank ?? i + 1}</span>
                    <span className="sb-list-art">
                      <CoverArt src={posterAt(it.poster, "w154")} title={it.title} />
                    </span>
                    <span className="sb-list-text">
                      <strong>{it.title}</strong>
                      <span>{[MEDIA_LABEL[it.mediaType], it.year, it.creator].filter(Boolean).join(" · ")}</span>
                      {it.note ? <em>“{it.note}”</em> : null}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */

const CSS = `
.sb { font-family:"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif; --ease: cubic-bezier(.2,.7,.2,1); --dur: 200ms; color: #f4f1ea; position: relative; }
.sb.is-reduced { --dur: 0ms; }
@media (prefers-reduced-motion: reduce) { .sb { --dur: 0ms; } }
.sb-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

.sb-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 18px; }
.sb-toolbar { display:inline-flex; gap:2px; padding:3px; border-radius:10px; background:rgba(255,255,255,.06); }
.sb-density { display:inline-flex; gap:4px; }
.sb-dbtn { width:40px; height:36px; border:0; border-radius:8px; background:rgba(255,255,255,.06); color:rgba(255,255,255,.85); font-size:20px; line-height:1; cursor:pointer; }
.sb-dbtn:hover { background:rgba(255,255,255,.12); } .sb-dbtn:disabled { opacity:.3; cursor:default; }
.sb-dbtn:focus-visible { outline:2px solid #e8c37a; outline-offset:2px; }
.sb-seg { min-height:36px; padding:0 14px; border:0; border-radius:8px; background:transparent; color:rgba(255,255,255,.6); font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.sb-seg.is-on { background:rgba(255,255,255,.12); color:#fff; }
.sb-seg:focus-visible, .sb-chip:focus-visible, .sb-icon:focus-visible, .sb-open:focus-visible, .sb-page:focus-visible { outline:2px solid #e8c37a; outline-offset:2px; }

.sb-main { min-width:0; }
.sb-shelf { position:relative; margin-bottom:26px; }
.sb-head { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:2px; padding:0 4px; }
.sb-head h2 { margin:0; font-size:17px; font-weight:650; letter-spacing:-.01em; }
.sb-head h2 a { color:inherit; text-decoration:none; }
.sb-head h2 a:hover { text-decoration:underline; text-underline-offset:3px; }
.sb-head p { margin:3px 0 0; font-size:12.5px; color:rgba(255,255,255,.5); }
.sb-head-actions { display:flex; gap:6px; align-items:center; flex-shrink:0; }
.sb-select select { min-height:36px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.04); color:#fff; padding:0 10px; font-size:12.5px; }
.sb-chip { min-height:36px; padding:0 13px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.04); color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; }
.sb-chip.is-on { background:#e8c37a; color:#141210; border-color:#e8c37a; }
.sb-chip:disabled { opacity:.35; cursor:default; }
.sb-empty { margin:10px 4px 0; font-size:13px; color:rgba(255,255,255,.45); }

.sb-track-wrap { position:relative; }
.sb-track { position:absolute; inset:0; overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain; scrollbar-width:none; -webkit-overflow-scrolling:touch; touch-action:pan-x pan-y; }
.sb-track::-webkit-scrollbar { display:none; }
.sb-track-inner { position:relative; }
.sb-plank { position:absolute; left:0; height:10px; border-radius:2px; background:linear-gradient(#3a3129,#221c17); box-shadow:0 8px 18px rgba(0,0,0,.45); }

.sb-spine { position:absolute; padding:0; border:0; border-radius:3px 3px 1px 1px; overflow:hidden; cursor:pointer; background:#26211d;
  box-shadow: inset 1px 0 0 rgba(255,255,255,.08), inset -1px 0 0 rgba(0,0,0,.4);
  transition: transform var(--dur) var(--ease), left 260ms var(--ease), opacity var(--dur) var(--ease);
  -webkit-tap-highlight-color: transparent; touch-action: pan-x pan-y; }
.sb-spine img, .sb-spine-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:50% 30%; }
.sb-spine-shade { position:absolute; inset:0; background:linear-gradient(90deg, rgba(0,0,0,.7), rgba(0,0,0,.45) 45%, rgba(0,0,0,.72)); }
.sb-spine-title { position:absolute; left:0; right:0; top:10px; bottom:26px; display:flex; align-items:center; justify-content:flex-start;
  writing-mode:vertical-rl; transform:rotate(180deg); color:#fff; font-weight:650; letter-spacing:.01em; line-height:1.1;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 2px rgba(0,0,0,.7); padding:0 2px; }
.sb-spine-year, .sb-spine-rank { position:absolute; bottom:7px; left:0; right:0; text-align:center; font-size:10px; font-weight:700; color:rgba(255,255,255,.75); }
.sb-spine-rank { color:#e8c37a; }
@media (hover:hover) and (pointer:fine) { .sb-spine:hover { transform: translateY(-6px); } }
.sb-spine:focus-visible { outline:2px solid #e8c37a; outline-offset:2px; transform: translateY(-6px); }
.sb-spine.is-out { opacity:0; transition:none; }
.sb.is-snap .sb-spine { transition:none; }
.sb-spine.is-editing { box-shadow: inset 0 0 0 1px rgba(232,195,122,.45); cursor: grab; }
.sb-spine.is-dragging { z-index:4; cursor:grabbing; transition: transform 120ms var(--ease); transform: translateY(-14px) scale(1.04);
  box-shadow: 0 16px 26px -6px rgba(0,0,0,.8), inset 0 0 0 1px rgba(232,195,122,.8); }
.sb-edit-hint { margin:4px 4px 0; font-size:12px; color:rgba(232,195,122,.85); }

.sb-cover img, .sb-grid-art img, .sb-list-art img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.sb-art-high { opacity:0; transition: opacity 160ms ease-out; }
.sb-art-high.is-ready { opacity:1; }
.sb-cover-fallback { width:100%; height:100%; display:flex; align-items:flex-end; padding:12px; box-sizing:border-box; }
.sb-cover-fallback span { font-weight:700; font-size:14px; line-height:1.2; }

.sb-page { position:absolute; top:calc(50% - 22px); width:44px; height:44px; border-radius:50%; border:1px solid rgba(255,255,255,.16);
  background:rgba(20,18,16,.82); color:#fff; font-size:22px; cursor:pointer; opacity:0; transition:opacity 150ms; z-index:4; backdrop-filter: blur(6px); }
.sb-page-l { left:-8px; } .sb-page-r { right:-8px; }
.sb-track-wrap:hover .sb-page, .sb-page:focus-visible { opacity:1; }



.sb-grid { list-style:none; margin:10px 0 26px; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:14px 12px; }
.sb-grid a { color:inherit; text-decoration:none; display:block; }
.sb-grid-art { position:relative; display:block; aspect-ratio:2/3; border-radius:5px; overflow:hidden; background:#1b1815; }
.sb-grid-title { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:6px; font-size:12.5px; line-height:1.3; color:rgba(255,255,255,.8); }
.sb-list { list-style:none; margin:8px 0 26px; padding:0; }
.sb-list a { display:flex; gap:12px; align-items:center; padding:8px 4px; min-height:64px; color:inherit; text-decoration:none; border-bottom:1px solid rgba(255,255,255,.06); }
.sb-list-n { width:22px; text-align:right; font-size:12px; color:rgba(255,255,255,.4); font-variant-numeric:tabular-nums; }
.sb-list-art { position:relative; width:40px; height:60px; border-radius:3px; overflow:hidden; flex-shrink:0; background:#1b1815; }
.sb-list-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
.sb-list-text strong { font-size:14px; font-weight:600; }
.sb-list-text span { font-size:12px; color:rgba(255,255,255,.5); }
.sb-list-text em { font-size:12.5px; color:rgba(255,255,255,.7); }

`;

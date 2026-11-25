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

/* ───────────────────────── geometry ───────────────────────── */

const PAD_X = 20;
const GAP = 5;
const HEADROOM = 26; // room above the spines for the lift

type Metrics = { spineH: number; coverW: number; coverH: number };
const METRICS: Record<"compact" | "wide", Metrics> = {
  compact: { spineH: 196, coverW: 136, coverH: 204 },
  wide: { spineH: 232, coverW: 156, coverH: 234 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const spineWidth = (key: string) => 40 + (hash(key) % 3) * 6; // 40 / 46 / 52
const spineHeightPct = (key: string) => 0.9 + ((hash(key) >> 3) % 11) / 100; // 90–100%

function layout(items: ShelfItem[]) {
  const lefts: number[] = [];
  const widths: number[] = [];
  let x = PAD_X;
  for (const it of items) {
    const w = spineWidth(it.key);
    lefts.push(x);
    widths.push(w);
    x += w + GAP;
  }
  return { lefts, widths, width: x - GAP + PAD_X };
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

const preloaded = new Set<string>();
function preload(src: string | null) {
  if (!src || preloaded.has(src) || typeof window === "undefined") return;
  preloaded.add(src);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
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
  selected: boolean;
  tabbable: boolean;
  editing: boolean;
  total: number;
  onSelect: (index: number) => void;
  onKey: (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => void;
  dragging?: boolean;
  onDragStart?: (e: React.PointerEvent<HTMLButtonElement>, index: number) => void;
};

const Spine = memo(function Spine({ item, index, left, width, height, selected, tabbable, editing, total, onSelect, onKey, dragging, onDragStart }: SpineProps) {
  const [broken, setBroken] = useState(false);
  const thumb = posterAt(item.poster, "w154");
  const len = item.title.length;
  const fs = len <= 18 ? 12 : len <= 32 ? 11 : 10;
  const h = Math.round(height * spineHeightPct(item.key));
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`${item.title}${item.year ? `, ${item.year}` : ""}. ${index + 1} of ${total}`}
      tabIndex={tabbable ? 0 : -1}
      data-index={index}
      className={`sb-spine${selected && !dragging ? " is-selected" : ""}${editing ? " is-editing" : ""}${dragging ? " is-dragging" : ""}`}
      style={{ left, width, height: h, top: HEADROOM + (height - h) }}
      aria-roledescription={editing ? "Draggable title" : undefined}
      onPointerDown={editing && onDragStart ? (e) => onDragStart(e, index) : undefined}
      onClick={() => onSelect(index)}
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

/* ───────────────────────── preview ───────────────────────── */

type PreviewProps = {
  shelf: Shelf;
  index: number;
  editing: boolean;
  canEdit: boolean;
  reduced: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
  onOpen: (item: ShelfItem) => void;
  onMove: (delta: number) => void;
};

function Preview({ shelf, index, editing, canEdit, reduced, onIndex, onClose, onOpen, onMove }: PreviewProps) {
  const item = shelf.items[index];
  const prev = useRef(index);
  const dir = index > prev.current ? 1 : index < prev.current ? -1 : 0;
  useEffect(() => {
    prev.current = index;
  }, [index]);

  // Horizontal swipe on the card steps through neighbours; vertical movement is left to the page.
  const drag = useRef<{ x: number; y: number; id: number; axis: "x" | "y" | null } | null>(null);
  const [dx, setDx] = useState(0);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.axis && Math.hypot(mx, my) > 8) d.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
    if (d.axis === "x") {
      const atEdge = (mx > 0 && index === 0) || (mx < 0 && index === shelf.items.length - 1);
      setDx(atEdge ? mx * 0.25 : mx);
    }
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") return setDx(0);
    const mx = e.clientX - d.x;
    setDx(0);
    if (mx < -44 && index < shelf.items.length - 1) onIndex(index + 1);
    else if (mx > 44 && index > 0) onIndex(index - 1);
  };

  return (
    <div className="sb-preview" role="region" aria-label={`${shelf.title}: selected title`}>
      <div className="sb-pv-top">
        <span className="sb-pv-count">
          {index + 1} / {shelf.items.length}
        </span>
        <div className="sb-pv-nav">
          <button type="button" className="sb-icon" aria-label="Previous title" disabled={index === 0} onClick={() => onIndex(index - 1)}>
            ‹
          </button>
          <button
            type="button"
            className="sb-icon"
            aria-label="Next title"
            disabled={index === shelf.items.length - 1}
            onClick={() => onIndex(index + 1)}
          >
            ›
          </button>
          <button type="button" className="sb-icon" aria-label="Close preview" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div
        className="sb-pv-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <article
          key={item?.key}
          className={`sb-pv-card${!reduced && dir ? (dir > 0 ? " from-right" : " from-left") : ""}`}
          style={dx ? { transform: `translateX(${dx}px)`, transition: "none", opacity: 1 - Math.min(Math.abs(dx) / 400, 0.4) } : undefined}
        >
          {item ? (
            <>
              <div className="sb-pv-meta">
                {item.rank != null ? <span className="sb-pv-rank">#{item.rank}</span> : null}
                <span>{MEDIA_LABEL[item.mediaType] ?? "Title"}</span>
                {item.year ? <span>{item.year}</span> : null}
              </div>
              <h3 className="sb-pv-title">{item.title}</h3>
              {item.creator ? <p className="sb-pv-creator">{item.creator}</p> : null}
              {item.note ? <p className="sb-pv-note">“{item.note}”</p> : null}
            </>
          ) : null}
        </article>
      </div>
      <div className="sb-pv-actions">
        <button type="button" className="sb-open" onClick={() => item && onOpen(item)}>
          Open title
        </button>
        {canEdit && editing ? (
          <div className="sb-move" role="group" aria-label="Move title">
            <button type="button" className="sb-chip" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move left">
              ← Move
            </button>
            <button type="button" className="sb-chip" disabled={index === shelf.items.length - 1} onClick={() => onMove(1)} aria-label="Move right">
              Move →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────────── shelf row ───────────────────────── */

type RowProps = {
  shelf: Shelf;
  shelfIndex: number;
  metrics: Metrics;
  selectedIndex: number | null;
  editing: boolean;
  canEdit: boolean;
  wide: boolean;
  reduced: boolean;
  trackRef: (el: HTMLDivElement | null) => void;
  sectionRef: (el: HTMLElement | null) => void;
  onSelect: (shelfIndex: number, index: number, opts?: { focus?: boolean }) => void;
  onKey: (e: ReactKeyboardEvent<HTMLButtonElement>, shelfIndex: number, index: number) => void;
  onToggleEdit: () => void;
  onVisibility: (v: Visibility) => void;
  onDragReorder: (shelfIndex: number, from: number, to: number) => void;
  preview: React.ReactNode;
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
  const { shelf, metrics } = p;
  const trackEl = useRef<HTMLDivElement | null>(null);

  /* ── drag to reorder (Arrange mode only) ──
     Mouse: press and move. Touch: hold briefly, then move — a quick swipe still
     scrolls the shelf. The other spines slide aside to show where it will land. */
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const baseGeo = useMemo(() => layout(shelf.items), [shelf.items]);
  const order = useMemo(() => (drag ? moved(shelf.items, drag.from, drag.to) : shelf.items), [shelf.items, drag]);
  const geo = useMemo(() => (drag ? layout(order) : baseGeo), [drag, order, baseGeo]);

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
        const rest = baseGeo.lefts.map((l, i) => ({ c: l + baseGeo.widths[i] / 2, i })).filter((s) => s.i !== index);
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
        if (active && st && st.to !== st.from) p.onDragReorder(p.shelfIndex, st.from, st.to);
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
    [baseGeo, p]
  );

  const [edges, setEdges] = useState({ start: true, end: false });
  const sel = p.selectedIndex;
  const selItem = sel != null ? shelf.items[sel] : null;

  const updateEdges = useCallback(() => {
    const t = trackEl.current;
    if (!t) return;
    setEdges({ start: t.scrollLeft < 4, end: t.scrollLeft + t.clientWidth > t.scrollWidth - 4 });
  }, []);
  useEffect(updateEdges, [updateEdges, geo.width]);

  // Preload a few covers around the selection so neighbouring swipes never flash.
  useEffect(() => {
    if (sel == null) return;
    for (let i = Math.max(0, sel - 3); i <= Math.min(shelf.items.length - 1, sel + 3); i++) preload(posterAt(shelf.items[i].poster, "w342"));
  }, [sel, shelf.items]);

  const page = (dir: number) => {
    const t = trackEl.current;
    if (!t) return;
    t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: p.reduced ? "auto" : "smooth" });
  };

  let coverLeft = 0;
  if (sel != null && geo.lefts[sel] != null) {
    const centre = geo.lefts[sel] + geo.widths[sel] / 2;
    coverLeft = Math.min(Math.max(centre - metrics.coverW / 2, 8), geo.width - metrics.coverW - 8);
  }
  const tabIndex = sel ?? 0;

  return (
    <section className={`sb-shelf${sel != null ? " has-selection" : ""}`} ref={p.sectionRef} aria-labelledby={`sb-h-${shelf.id}`}>
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

      {p.editing ? <p className="sb-edit-hint">Drag a title to move it, or select one and use the Move buttons (Alt + ← / → on a keyboard).</p> : null}
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
              p.trackRef(el);
            }}
            onScroll={updateEdges}
          >
            <div className="sb-track-inner" style={{ width: geo.width, height: metrics.spineH + HEADROOM + 14 }}>
              {shelf.items.map((it, i) => {
                const isDragged = drag?.from === i;
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
                    selected={sel === i}
                    tabbable={tabIndex === i}
                    editing={p.editing}
                    total={shelf.items.length}
                    dragging={isDragged}
                    onDragStart={onDragStart}
                    onSelect={(i2) => {
                      if (suppressClick.current) return;
                      p.onSelect(p.shelfIndex, i2);
                    }}
                    onKey={(e, i2) => p.onKey(e, p.shelfIndex, i2)}
                  />
                );
              })}
              {selItem && !drag ? (
                <div
                  className="sb-cover"
                  aria-hidden="true"
                  style={{ left: coverLeft, width: metrics.coverW, height: metrics.coverH, top: HEADROOM + metrics.spineH - metrics.coverH }}
                  onClick={() => p.onSelect(p.shelfIndex, sel!)}
                >
                  <CoverArt src={posterAt(selItem.poster, "w342")} low={posterAt(selItem.poster, "w154")} title={selItem.title} />
                </div>
              ) : null}
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
      {p.preview}
    </section>
  );
}

/* ───────────────────────── browser ───────────────────────── */

type Selection = { shelfId: string; key: string } | null;

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

  const [selection, setSelection] = useState<Selection>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"shelf" | "grid" | "list">("shelf");
  const [announce, setAnnounce] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const tracks = useRef<Map<string, HTMLDivElement>>(new Map());
  const sections = useRef<Map<string, HTMLElement>>(new Map());

  const selShelfIndex = selection ? shelves.findIndex((s) => s.id === selection.shelfId) : -1;
  const selShelf = selShelfIndex >= 0 ? shelves[selShelfIndex] : null;
  const selIndex = selShelf && selection ? selShelf.items.findIndex((i) => i.key === selection.key) : -1;

  /* keep the selected spine in view, horizontally only */
  const revealSpine = useCallback(
    (shelfId: string, index: number, smooth: boolean) => {
      const track = tracks.current.get(shelfId);
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!track || !shelf) return;
      const geo = layout(shelf.items);
      const centre = geo.lefts[index] + geo.widths[index] / 2;
      const half = metrics.coverW / 2 + 24;
      const view0 = track.scrollLeft;
      const view1 = view0 + track.clientWidth;
      let next = view0;
      if (centre - half < view0) next = centre - half;
      else if (centre + half > view1) next = centre + half - track.clientWidth;
      if (Math.abs(next - view0) > 1) track.scrollTo({ left: Math.max(0, next), behavior: smooth && !reduced ? "smooth" : "auto" });
    },
    [shelves, metrics.coverW, reduced]
  );

  const focusSpine = (shelfId: string, index: number) => {
    const el = tracks.current.get(shelfId)?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`);
    el?.focus({ preventScroll: true });
  };

  const select = useCallback(
    (shelfIndex: number, index: number, opts: { focus?: boolean; smooth?: boolean } = {}) => {
      const shelf = shelves[shelfIndex];
      const item = shelf?.items[index];
      if (!item) return;
      setSelection({ shelfId: shelf.id, key: item.key });
      setAnnounce(`${item.title}${item.year ? `, ${item.year}` : ""}. ${index + 1} of ${shelf.items.length} in ${shelf.title}.`);
      revealSpine(shelf.id, index, opts.smooth ?? true);
      if (opts.focus) focusSpine(shelf.id, index);
      // Make sure the preview is visible below the shelf on phones without a big jump.
      if (!wide) {
        requestAnimationFrame(() => {
          const pv = sections.current.get(shelf.id)?.querySelector(".sb-preview");
          pv?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
        });
      }
    },
    [shelves, revealSpine, wide, reduced]
  );

  const clear = useCallback(() => {
    setSelection(null);
    setAnnounce("Preview closed.");
  }, []);

  /* tap / click outside dismisses */
  useEffect(() => {
    if (!selection) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest(".sb-spine, .sb-cover, .sb-preview, .sb-head-actions, .sb-page, .sb-toolbar")) return;
      setSelection(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const id = selection.shelfId;
        const idx = selIndex;
        setSelection(null);
        if (idx >= 0) focusSpine(id, idx);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [selection, selIndex]);

  /* reorder (explicit Arrange mode only) */
  const move = useCallback(
    (delta: number) => {
      if (!selShelf || selIndex < 0 || !onReorder) return;
      const to = selIndex + delta;
      if (to < 0 || to >= selShelf.items.length) return;
      const next = [...selShelf.items];
      const [it] = next.splice(selIndex, 1);
      next.splice(to, 0, it);
      onReorder(selShelf, next);
      setAnnounce(`Moved ${it.title} to position ${to + 1}.`);
      requestAnimationFrame(() => revealSpine(selShelf.id, to, true));
    },
    [selShelf, selIndex, onReorder, revealSpine]
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

  const onKey = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, shelfIndex: number, index: number) => {
      const shelf = shelves[shelfIndex];
      const isSel = selection?.shelfId === shelf.id && selection.key === shelf.items[index]?.key;
      const editing = editingId === shelf.id;
      const go = (si: number, i: number) => {
        e.preventDefault();
        const s = shelves[si];
        if (!s || !s.items.length) return;
        select(si, Math.max(0, Math.min(s.items.length - 1, i)), { focus: true });
      };
      if (editing && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        if (!isSel) select(shelfIndex, index);
        move(e.key === "ArrowLeft" ? -1 : 1);
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
        case "Enter":
          if (isSel) {
            e.preventDefault();
            openItem(shelf.items[index]);
          }
          return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelves, selection, editingId, select, move]
  );

  /* scroll memory: rows, selection and page offset survive a trip to a title page */
  const save = useCallback(() => {
    try {
      const rows: Record<string, number> = {};
      tracks.current.forEach((el, id) => (rows[id] = el.scrollLeft));
      sessionStorage.setItem(storageKey, JSON.stringify({ rows, selection, y: window.scrollY, view }));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, selection, view]);

  const restored = useRef(false);
  useLayoutEffect(() => {
    if (restored.current || !shelves.length) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw) as { rows: Record<string, number>; selection: Selection; y: number; view?: typeof view };
      if (s.view) setView(s.view);
      Object.entries(s.rows ?? {}).forEach(([id, x]) => {
        const el = tracks.current.get(id);
        if (el) el.scrollLeft = x;
      });
      if (s.selection && shelves.some((sh) => sh.id === s.selection!.shelfId && sh.items.some((i) => i.key === s.selection!.key))) {
        setSelection(s.selection);
      }
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

  /* desktop: the preview sits beside the selected shelf */
  const [sideTop, setSideTop] = useState(0);
  useLayoutEffect(() => {
    if (!wide || !selShelf) return;
    const sec = sections.current.get(selShelf.id);
    const aside = asideRef.current;
    if (sec && aside) setSideTop(Math.max(0, sec.getBoundingClientRect().top - aside.getBoundingClientRect().top + 44));
  }, [wide, selShelf, shelves]);

  const renderPreview = () =>
    selShelf && selIndex >= 0 ? (
      <Preview
        key={selShelf.id}
        shelf={selShelf}
        index={selIndex}
        editing={editingId === selShelf.id}
        canEdit={canEdit}
        reduced={reduced}
        onIndex={(i) => select(selShelfIndex, i)}
        onClose={() => {
          const id = selShelf.id;
          clear();
          focusSpine(id, selIndex);
        }}
        onOpen={openItem}
        onMove={move}
      />
    ) : null;

  return (
    <div className={`sb${reduced ? " is-reduced" : ""}`} ref={rootRef}>
      <style>{CSS}</style>
      <div className="sb-toolbar" role="group" aria-label="View">
        {(["shelf", "grid", "list"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} className={`sb-seg${view === v ? " is-on" : ""}`} onClick={() => setView(v)}>
            {v === "shelf" ? "Shelf" : v === "grid" ? "Grid" : "List"}
          </button>
        ))}
      </div>

      {view !== "shelf" ? (
        <FlatViews shelves={shelves} view={view} onOpen={openItem} />
      ) : (
        <div className={`sb-layout${wide ? " is-wide" : ""}`}>
          <div className="sb-main">
            {shelves.map((shelf, si) => (
              <ShelfRow
                key={shelf.id}
                shelf={shelf}
                shelfIndex={si}
                metrics={metrics}
                selectedIndex={selShelf?.id === shelf.id && selIndex >= 0 ? selIndex : null}
                editing={editingId === shelf.id}
                canEdit={canEdit}
                wide={wide}
                reduced={reduced}
                trackRef={(el) => (el ? tracks.current.set(shelf.id, el) : tracks.current.delete(shelf.id))}
                sectionRef={(el) => (el ? sections.current.set(shelf.id, el) : sections.current.delete(shelf.id))}
                onSelect={select}
                onKey={onKey}
                onToggleEdit={() => setEditingId((cur) => (cur === shelf.id ? null : shelf.id))}
                onDragReorder={onDragReorder}
                onVisibility={(v) => onVisibility?.(shelf, v)}
                preview={!wide && selShelf?.id === shelf.id ? renderPreview() : null}
              />
            ))}
          </div>
          {wide ? (
            <aside className="sb-side" aria-label="Selected title" ref={asideRef}>
              <div className={`sb-side-inner${selShelf ? " is-open" : ""}`} style={{ transform: `translateY(${sideTop}px)` }}>
                {renderPreview() ?? <p className="sb-side-hint">Select a title to preview it.</p>}
              </div>
            </aside>
          ) : null}
        </div>
      )}
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

.sb-toolbar { display:inline-flex; gap:2px; padding:3px; border-radius:10px; background:rgba(255,255,255,.06); margin: 0 0 18px; }
.sb-seg { min-height:36px; padding:0 14px; border:0; border-radius:8px; background:transparent; color:rgba(255,255,255,.6); font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.sb-seg.is-on { background:rgba(255,255,255,.12); color:#fff; }
.sb-seg:focus-visible, .sb-chip:focus-visible, .sb-icon:focus-visible, .sb-open:focus-visible, .sb-page:focus-visible { outline:2px solid #e8c37a; outline-offset:2px; }

.sb-layout.is-wide { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:28px; align-items:start; }
.sb-main { min-width:0; }
.sb-shelf { position:relative; margin-bottom:26px; }
.sb-shelf.has-selection { z-index:3; }
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
.sb-spine.is-selected { opacity:0; }
.sb-spine.is-editing { box-shadow: inset 0 0 0 1px rgba(232,195,122,.45); cursor: grab; }
.sb-spine.is-dragging { z-index:4; cursor:grabbing; transition: transform 120ms var(--ease); transform: translateY(-14px) scale(1.04);
  box-shadow: 0 16px 26px -6px rgba(0,0,0,.8), inset 0 0 0 1px rgba(232,195,122,.8); }
.sb-edit-hint { margin:4px 4px 0; font-size:12px; color:rgba(232,195,122,.85); }

.sb-cover { position:absolute; z-index:2; border-radius:5px; overflow:hidden; cursor:pointer; background:#1b1815;
  box-shadow: 0 18px 30px -8px rgba(0,0,0,.75), 0 4px 10px rgba(0,0,0,.4);
  transform: translateY(-12px); transition: left 240ms var(--ease), transform var(--dur) var(--ease);
  animation: sb-lift var(--dur) var(--ease); }
@keyframes sb-lift { from { transform: translateY(0) scale(.94); opacity:.4; } to { transform: translateY(-12px) scale(1); opacity:1; } }
.sb-cover img, .sb-grid-art img, .sb-list-art img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.sb-art-high { opacity:0; transition: opacity 160ms ease-out; }
.sb-art-high.is-ready { opacity:1; }
.sb-cover-fallback { width:100%; height:100%; display:flex; align-items:flex-end; padding:12px; box-sizing:border-box; }
.sb-cover-fallback span { font-weight:700; font-size:14px; line-height:1.2; }

.sb-page { position:absolute; top:calc(50% - 22px); width:44px; height:44px; border-radius:50%; border:1px solid rgba(255,255,255,.16);
  background:rgba(20,18,16,.82); color:#fff; font-size:22px; cursor:pointer; opacity:0; transition:opacity 150ms; z-index:4; backdrop-filter: blur(6px); }
.sb-page-l { left:-8px; } .sb-page-r { right:-8px; }
.sb-track-wrap:hover .sb-page, .sb-page:focus-visible { opacity:1; }

.sb-preview { scroll-margin-bottom:140px; scroll-margin-top:90px; background:#1c1916; border:1px solid rgba(255,255,255,.09); border-radius:14px; padding:12px 14px 14px; box-shadow:0 14px 34px rgba(0,0,0,.45); }
.sb-main .sb-preview { position:absolute; left:4px; right:4px; top:calc(100% - 8px); z-index:5; animation: sb-drop var(--dur) var(--ease); }
@keyframes sb-drop { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
.sb-pv-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
.sb-pv-count { font-size:12px; color:rgba(255,255,255,.45); font-variant-numeric:tabular-nums; }
.sb-pv-nav { display:flex; gap:2px; }
.sb-icon { width:44px; height:36px; border:0; border-radius:8px; background:transparent; color:rgba(255,255,255,.75); font-size:22px; line-height:1; cursor:pointer; }
.sb-icon:hover { background:rgba(255,255,255,.07); } .sb-icon:disabled { opacity:.25; cursor:default; }
.sb-pv-stage { overflow:hidden; touch-action:pan-y; min-height:84px; }
.sb-pv-card { transition: transform 160ms var(--ease), opacity 160ms var(--ease); }
.sb-pv-card.from-right { animation: sb-in-r var(--dur) var(--ease); }
.sb-pv-card.from-left { animation: sb-in-l var(--dur) var(--ease); }
@keyframes sb-in-r { from { transform:translateX(18px); opacity:.2; } to { transform:none; opacity:1; } }
@keyframes sb-in-l { from { transform:translateX(-18px); opacity:.2; } to { transform:none; opacity:1; } }
.sb-pv-meta { display:flex; gap:8px; font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; color:rgba(255,255,255,.5); }
.sb-pv-rank { color:#e8c37a; font-weight:700; }
.sb-pv-title { margin:5px 0 0; font-size:18px; line-height:1.25; font-weight:650; letter-spacing:-.01em; overflow-wrap:anywhere; }
.sb-pv-creator { margin:4px 0 0; font-size:13px; color:rgba(255,255,255,.6); }
.sb-pv-note { margin:8px 0 0; font-size:13px; color:rgba(255,255,255,.75); font-style:italic; }
.sb-pv-actions { display:flex; gap:8px; align-items:center; justify-content:space-between; margin-top:12px; flex-wrap:wrap; }
.sb-open { min-height:44px; padding:0 20px; border-radius:999px; border:0; background:#f4f1ea; color:#141210; font-weight:700; font-size:14px; cursor:pointer; }
.sb-open:hover { background:#fff; }
.sb-move { display:flex; gap:6px; }

.sb-side { position:relative; min-height:1px; }
.sb-side-inner { transition: transform 240ms var(--ease); }
.sb-side-hint { margin:40px 0 0; font-size:13px; color:rgba(255,255,255,.35); }

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

@media (prefers-reduced-motion: reduce) {
  .sb-cover, .sb-pv-card, .sb-main .sb-preview { animation:none !important; }
  .sb-cover { transform: translateY(-12px); }
}
`;

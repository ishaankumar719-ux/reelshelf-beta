"use client";

// The cover stage (web): clicking a spine pulls the title out of the shelf, turns it to show
// its front cover and settles it in the middle of the window. Swipe, scroll or use ← / → to
// move through neighbouring covers; Esc, the close button, a click outside or a swipe down
// puts it back. The page and the shelf never scroll underneath, so you return to where you were.
// Same choreography as components/shelves/CoverStage.tsx in the iPhone app.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { posterAt, type Shelf, type ShelfItem } from "../../lib/shelves";

export type Rect = { x: number; y: number; w: number; h: number };

const OPEN_MS = 560;
const CLOSE_MS = 440;
const MEDIA_LABEL: Record<string, string> = { movie: "Film", tv: "Series", book: "Book", short_film: "Short" };
const ease = (t: number) => 1 - Math.pow(1 - t, 3.2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const fallbackBg = (seed: string) => {
  const h = hash(seed) % 360;
  return `linear-gradient(160deg, hsl(${h} 28% 26%), hsl(${(h + 40) % 360} 30% 12%))`;
};
const big = (u: string | null) => (u ? u.replace(/\/t\/p\/(w\d+|original)\//, "/t/p/w500/") : null);

type Props = {
  shelf: Shelf;
  startKey: string;
  spineRect: (key: string) => Rect | null;
  reduced: boolean;
  canEdit: boolean;
  editing: boolean;
  onKeyChange: (key: string) => void;
  onMove: (key: string, delta: number) => void;
  onOpenTitle: (item: ShelfItem) => void;
  onClosed: (key: string) => void;
};

export default function CoverStage(p: Props) {
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 1024 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 768 : window.innerHeight));
  useEffect(() => {
    const on = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const CW = Math.round(Math.max(150, Math.min(vw * 0.62, 340, (vh * 0.56) / 1.5)));
  const CH = Math.round(CW * 1.5);
  const ITEM = CW + 32;
  const topY = Math.max(64, Math.round((vh - CH - 200) / 2));
  const target: Rect = { x: (vw - CW) / 2, y: topY, w: CW, h: CH };

  const items = p.shelf.items;
  const [key, setKey] = useState(p.startKey);
  const index = Math.max(0, items.findIndex((i) => i.key === key));
  const item = items[index];
  const [settled, setSettled] = useState(false);
  // Where the flight starts/ends: the spine's rect, or null to fade in place.
  const [initialFrom] = useState<Rect | null>(() => (p.reduced ? null : p.spineRect(p.startKey)));
  const fromRef = useRef<Rect | null>(initialFrom);
  const [flyKey, setFlyKey] = useState(p.startKey);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chromeRefs = useRef<HTMLElement[]>([]);
  const flyRef = useRef<HTMLDivElement>(null);
  const spineFaceRef = useRef<HTMLDivElement>(null);
  const coverFaceRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const dragY = useRef(0);
  const raf = useRef(0);
  const closing = useRef(false);

  /* ── paint one frame of the pull-out/turn from `progress` ── */
  const paint = useCallback(() => {
    const t = progress.current;
    const d = dragY.current;
    const from = fromRef.current;
    const turn = !p.reduced && !!from;
    const start: Rect = turn && from ? from : { x: target.x - 1, y: target.y, w: 1, h: target.h };
    const pull = Math.min(36, start.h * 0.2);
    const glide = ease(seg(t, 0.45, 1));
    const lifted = ease(seg(t, 0, 0.25));
    const bookW = start.h / 1.5;
    const fly = flyRef.current;
    if (fly) {
      fly.style.left = `${lerp(start.x + start.w, target.x, glide)}px`;
      fly.style.top = `${lerp(start.y - pull * lifted, target.y, glide)}px`;
      fly.style.width = `${lerp(bookW, target.w, glide)}px`;
      fly.style.height = `${lerp(start.h, target.h, glide)}px`;
      fly.style.opacity = turn ? "1" : String(t);
    }
    const a = turn ? ease(seg(t, 0.18, 0.62)) * 90 : 90;
    if (spineFaceRef.current) {
      spineFaceRef.current.style.width = `${start.w}px`;
      spineFaceRef.current.style.height = `${start.h}px`;
      spineFaceRef.current.style.left = `${-start.w}px`;
      spineFaceRef.current.style.transform = `perspective(700px) rotateY(${a}deg)`;
      spineFaceRef.current.style.opacity = a >= 89 ? "0" : "1";
    }
    if (coverFaceRef.current) {
      coverFaceRef.current.style.transform = `perspective(700px) rotateY(${a - 90}deg)`;
      coverFaceRef.current.style.opacity = a - 90 <= -89 ? "0" : "1";
    }
    const fade = 1 - Math.min(1, d / 260) * 0.65;
    const dim = t < 0.45 ? (t / 0.45) * 0.7 : 0.7 + ((t - 0.45) / 0.55) * 0.3;
    if (backdropRef.current) backdropRef.current.style.opacity = String(dim * fade);
    if (contentRef.current) contentRef.current.style.transform = d ? `translateY(${d}px) scale(${1 - Math.min(d, 300) / 300 * 0.14})` : "";
    const chrome = String(seg(t, 0.6, 1) * (1 - Math.min(1, d / 120)));
    chromeRefs.current.forEach((el) => el && (el.style.opacity = chrome));
  }, [p.reduced, target.x, target.y, target.w, target.h]);

  const animate = useCallback(
    (to: number, ms: number, done?: () => void) => {
      cancelAnimationFrame(raf.current);
      const p0 = progress.current;
      const d0 = dragY.current;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = ms ? clamp01((now - t0) / ms) : 1;
        progress.current = lerp(p0, to, k);
        dragY.current = lerp(d0, 0, ease(k));
        paint();
        if (k < 1) raf.current = requestAnimationFrame(step);
        else done?.();
      };
      raf.current = requestAnimationFrame(step);
    },
    [paint]
  );

  /* ── open ── */
  useLayoutEffect(() => {
    // Keep the page exactly where it is underneath.
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    paint();
    animate(1, p.reduced ? 160 : fromRef.current ? OPEN_MS : 260, () => setSettled(true));
    return () => {
      html.style.overflow = prevOverflow;
      cancelAnimationFrame(raf.current);
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Strip starts on the opening cover; focus moves into the dialog once it has landed.
  useLayoutEffect(() => {
    const s = stripRef.current;
    if (s) s.scrollLeft = index * ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ITEM]);
  useEffect(() => {
    if (settled) rootRef.current?.querySelector<HTMLElement>(".cs-current")?.focus({ preventScroll: true });
  }, [settled]);

  // Warm neighbouring covers.
  useEffect(() => {
    for (let i = Math.max(0, index - 3); i <= Math.min(items.length - 1, index + 3); i++) {
      const u = big(items[i].poster);
      if (u) {
        const img = new Image();
        img.decoding = "async";
        img.src = u;
      }
    }
  }, [index, items]);

  /* ── close: fly back to the spine of whatever is showing now ── */
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const back = p.reduced ? null : p.spineRect(key);
    fromRef.current = back;
    setFlyKey(key);
    setSettled(false);
    // Wait one frame for the flying cover to mount, then play the pull-out backwards.
    requestAnimationFrame(() =>
      // The shelf moves focus to the spine of the title that was showing.
      animate(0, p.reduced || !back ? 200 : CLOSE_MS, () => p.onClosed(key))
    );
  }, [key, p, animate]);
  useLayoutEffect(() => {
    if (!settled && closing.current) paint();
  }, [settled, flyKey, paint]);

  /* ── strip: neighbours sit back and turn slightly; the nearest becomes current ── */
  const choose = useCallback(
    (k: string) => {
      setKey((cur) => {
        if (cur === k) return cur;
        p.onKeyChange(k);
        return k;
      });
    },
    [p]
  );
  const shape = useCallback(() => {
    const s = stripRef.current;
    if (!s) return;
    const x = s.scrollLeft;
    s.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => {
      const i = Number(el.dataset.i);
      const d = Math.max(-1.5, Math.min(1.5, (x - i * ITEM) / ITEM));
      const ad = Math.abs(d);
      el.style.opacity = String(ad <= 1 ? 1 - 0.5 * ad : 0.5 - (ad - 1) * 0.5);
      el.style.transform = p.reduced
        ? `scale(${1 - 0.1 * Math.min(ad, 1)})`
        : `perspective(900px) rotateY(${d * 22}deg) scale(${1 - 0.12 * Math.min(ad, 1)})`;
    });
    const i = Math.max(0, Math.min(items.length - 1, Math.round(x / ITEM)));
    if (items[i] && items[i].key !== key) choose(items[i].key);
  }, [ITEM, items, key, choose, p.reduced]);
  const shapeRaf = useRef(0);
  const onStripScroll = () => {
    cancelAnimationFrame(shapeRaf.current);
    shapeRaf.current = requestAnimationFrame(shape);
  };
  useLayoutEffect(shape, [shape, settled]);

  const goTo = useCallback(
    (i: number) => {
      const s = stripRef.current;
      if (!s || i < 0 || i >= items.length) return;
      s.scrollTo({ left: i * ITEM, behavior: p.reduced ? "auto" : "smooth" });
    },
    [ITEM, items.length, p.reduced]
  );
  // Follow moves made with the Move buttons.
  useEffect(() => {
    const s = stripRef.current;
    if (!s || !settled) return;
    const cur = Math.round(s.scrollLeft / ITEM);
    if (cur !== index) s.scrollLeft = index * ITEM;
  }, [index, settled, ITEM]);

  /* ── keyboard: ← → move, Enter opens, Esc closes, Tab stays inside ── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      return close();
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if ((e.target as HTMLElement).tagName === "BUTTON" && !(e.target as HTMLElement).classList.contains("cs-current")) return;
      e.preventDefault();
      if (p.editing && e.altKey) return p.onMove(key, e.key === "ArrowLeft" ? -1 : 1);
      return goTo(index + (e.key === "ArrowRight" ? 1 : -1));
    }
    if (e.key === "Tab") {
      const els = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []).filter(
        (el) => el.tabIndex >= 0
      );
      if (!els.length) return;
      const i = els.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : i === els.length - 1 ? 0 : i + 1;
      e.preventDefault();
      els[next].focus();
    }
  };

  /* ── touch: swipe down to put it back ── */
  const swipe = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || !settled) return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis && Math.hypot(dx, dy) > 10) s.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
    if (s.axis === "y") {
      dragY.current = Math.max(0, dy);
      paint();
    }
  };
  const onPointerUp = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.axis !== "y") return;
    if (dragY.current > 110) close();
    else animate(1, 220);
  };

  const flyItem = items.find((i) => i.key === flyKey) ?? item;
  const chromeRef = (el: HTMLElement | null) => {
    if (el && !chromeRefs.current.includes(el)) chromeRefs.current.push(el);
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`cs${p.reduced ? " is-reduced" : ""}`}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${p.shelf.title}: ${item?.title ?? ""}`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <style>{CSS}</style>
      <div className="cs-backdrop" ref={backdropRef} onClick={close} />
      <div className="cs-content" ref={contentRef}>
        <div className="cs-top" ref={chromeRef}>
          <span className="cs-count" aria-live="polite">
            {index + 1} / {items.length}
          </span>
          <button type="button" className="cs-close" aria-label="Put back on the shelf" onClick={close}>
            ×
          </button>
        </div>

        <div className="cs-strip-wrap" style={{ top: target.y, height: CH, visibility: settled ? "visible" : "hidden" }}>
          <div
            className="cs-strip"
            ref={stripRef}
            onScroll={onStripScroll}
            style={{ paddingLeft: (vw - ITEM) / 2, paddingRight: (vw - ITEM) / 2 }}
            aria-label={`${p.shelf.title} covers`}
          >
            {items.map((it, i) =>
              Math.abs(i - index) > 6 ? (
                <div key={it.key} className="cs-slot" style={{ width: ITEM, height: CH }} />
              ) : (
                <div key={it.key} className="cs-slot" style={{ width: ITEM, height: CH }}>
                  <button
                    type="button"
                    data-i={i}
                    className={`cs-card${it.key === key ? " cs-current" : ""}`}
                    style={{ width: CW, height: CH }}
                    tabIndex={it.key === key ? 0 : -1}
                    aria-label={`${it.title}${it.year ? `, ${it.year}` : ""}. ${i + 1} of ${items.length}. Press Enter to open.`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (it.key === key) p.onOpenTitle(it);
                      else goTo(i);
                    }}
                  >
                    <Cover item={it} />
                  </button>
                </div>
              )
            )}
          </div>
          <button type="button" className="cs-nav cs-prev" ref={chromeRef} aria-label="Previous title" disabled={index === 0} onClick={() => goTo(index - 1)}>
            ‹
          </button>
          <button type="button" className="cs-nav cs-next" ref={chromeRef} aria-label="Next title" disabled={index === items.length - 1} onClick={() => goTo(index + 1)}>
            ›
          </button>
        </div>

        {item ? (
          <div className="cs-info" ref={chromeRef} style={{ top: target.y + CH + 22 }}>
            <div className="cs-meta">
              {item.rank != null ? <span className="cs-rank">#{item.rank}</span> : null}
              <span>{MEDIA_LABEL[item.mediaType] ?? "Title"}</span>
              {item.year ? <span>{item.year}</span> : null}
            </div>
            <h2 className="cs-title">{item.title}</h2>
            {item.creator ? <p className="cs-creator">{item.creator}</p> : null}
            {item.note ? <p className="cs-note">“{item.note}”</p> : null}
            <div className="cs-actions">
              <button type="button" className="cs-open" onClick={() => p.onOpenTitle(item)}>
                Open title
              </button>
              {p.canEdit && p.editing ? (
                <div className="cs-move" role="group" aria-label="Move on the shelf">
                  <button type="button" className="cs-chip" disabled={index === 0} onClick={() => p.onMove(key, -1)} aria-label="Move left on the shelf">
                    ← Move
                  </button>
                  <button type="button" className="cs-chip" disabled={index === items.length - 1} onClick={() => p.onMove(key, 1)} aria-label="Move right on the shelf">
                    Move →
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!settled && flyItem ? (
          <div className="cs-fly" ref={flyRef} aria-hidden="true">
            <div className="cs-spine-face" ref={spineFaceRef}>
              {flyItem.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterAt(flyItem.poster, "w154") ?? undefined} alt="" draggable={false} />
              ) : (
                <span style={{ position: "absolute", inset: 0, background: fallbackBg(flyItem.title) }} />
              )}
              <span className="cs-spine-shade" />
            </div>
            <div className="cs-cover-face" ref={coverFaceRef}>
              <Cover item={flyItem} />
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/** Small artwork (already cached from the spine) first, sharp cover fades in once decoded. */
function Cover({ item }: { item: ShelfItem }) {
  const low = posterAt(item.poster, "w154");
  const hi = big(item.poster);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!hi) return;
    let live = true;
    const img = new Image();
    img.src = hi;
    if (img.complete && img.naturalWidth) setReady(true);
    else img.decode().then(() => live && setReady(true), () => {});
    return () => {
      live = false;
    };
  }, [hi]);
  if (!low) {
    return (
      <span className="cs-fallback" style={{ background: fallbackBg(item.title) }}>
        <span>{item.title}</span>
      </span>
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cs-low" src={low} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {hi ? <img className={`cs-hi${ready ? " is-ready" : ""}`} src={hi} alt="" draggable={false} /> : null}
    </>
  );
}

const CSS = `
.cs { position:fixed; inset:0; z-index:1000; font-family:"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif; color:#f4f1ea; touch-action:none; }
.cs-backdrop { position:absolute; inset:0; background:rgba(9,8,7,.94); opacity:0; backdrop-filter: blur(3px); }
.cs-content { position:absolute; inset:0; pointer-events:none; transform-origin:50% 30%; }
.cs-content > * { pointer-events:auto; }
.cs-top { position:absolute; top:14px; left:20px; right:14px; height:44px; display:flex; align-items:center; justify-content:space-between; opacity:0; pointer-events:none; }
.cs-top > * { pointer-events:auto; }
.cs-count { font-size:13px; color:rgba(255,255,255,.6); font-variant-numeric:tabular-nums; }
.cs-close { width:44px; height:44px; border-radius:50%; border:0; background:rgba(255,255,255,.08); color:#fff; font-size:26px; line-height:1; cursor:pointer; }
.cs-close:hover { background:rgba(255,255,255,.14); }
.cs-strip-wrap { position:absolute; left:0; right:0; }
.cs-strip { display:flex; height:100%; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; scrollbar-width:none; overscroll-behavior:contain; touch-action:pan-x; box-sizing:border-box; }
.cs-strip::-webkit-scrollbar { display:none; }
.cs-slot { flex:none; display:flex; justify-content:center; scroll-snap-align:center; scroll-snap-stop:always; }
.cs-card { position:relative; padding:0; border:0; border-radius:6px; overflow:hidden; background:#1b1815; cursor:pointer;
  box-shadow:0 26px 50px -10px rgba(0,0,0,.85), 0 6px 14px rgba(0,0,0,.45); will-change:transform; transform-origin:50% 50%; }
.cs-card.cs-current:focus-visible { outline:2px solid #e8c37a; outline-offset:4px; }
.cs-card img, .cs-cover-face img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.cs-hi { opacity:0; transition:opacity 160ms ease-out; } .cs-hi.is-ready { opacity:1; }
.cs-fallback { position:absolute; inset:0; display:flex; align-items:flex-end; padding:14px; box-sizing:border-box; }
.cs-fallback span { font-weight:700; font-size:18px; line-height:1.2; }
.cs-nav { position:absolute; top:calc(50% - 24px); width:48px; height:48px; border-radius:50%; border:1px solid rgba(255,255,255,.16);
  background:rgba(20,18,16,.8); color:#fff; font-size:26px; line-height:1; cursor:pointer; opacity:0; backdrop-filter:blur(6px); }
.cs-nav:disabled { visibility:hidden; }
.cs-prev { left:max(12px, calc(50% - 360px)); } .cs-next { right:max(12px, calc(50% - 360px)); }
@media (hover:none) { .cs-nav { display:none; } }
.cs-info { position:absolute; left:24px; right:24px; text-align:center; opacity:0; max-width:560px; margin:0 auto; }
.cs-meta { display:flex; gap:8px; justify-content:center; font-size:11.5px; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.55); }
.cs-rank { color:#e8c37a; font-weight:700; }
.cs-title { margin:6px 0 0; font-size:22px; line-height:1.2; font-weight:650; letter-spacing:-.01em; overflow-wrap:anywhere; }
.cs-creator { margin:4px 0 0; font-size:14px; color:rgba(255,255,255,.6); }
.cs-note { margin:8px 0 0; font-size:14px; color:rgba(255,255,255,.75); font-style:italic; }
.cs-actions { margin-top:16px; display:flex; flex-direction:column; align-items:center; gap:10px; }
.cs-open { min-height:46px; padding:0 28px; border-radius:999px; border:0; background:#f4f1ea; color:#141210; font-weight:700; font-size:15px; cursor:pointer; }
.cs-open:hover { background:#fff; }
.cs-move { display:flex; gap:8px; }
.cs-chip { min-height:38px; padding:0 14px; border-radius:999px; border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.05); color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
.cs-chip:disabled { opacity:.35; cursor:default; }
.cs-open:focus-visible, .cs-chip:focus-visible, .cs-close:focus-visible, .cs-nav:focus-visible { outline:2px solid #e8c37a; outline-offset:2px; }
.cs-fly { position:absolute; pointer-events:none; }
.cs-spine-face { position:absolute; top:0; border-radius:3px 3px 1px 1px; overflow:hidden; background:#26211d; transform-origin:right center; backface-visibility:hidden; }
.cs-spine-face img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:50% 30%; }
.cs-spine-shade { position:absolute; inset:0; background:linear-gradient(90deg, rgba(0,0,0,.7), rgba(0,0,0,.45) 45%, rgba(0,0,0,.72)); }
.cs-cover-face { position:absolute; inset:0; border-radius:6px; overflow:hidden; background:#1b1815; transform-origin:left center; backface-visibility:hidden;
  box-shadow:0 26px 50px -10px rgba(0,0,0,.85); }
`;

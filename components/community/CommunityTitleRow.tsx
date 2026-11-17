"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export default function CommunityTitleRow({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 16);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 16);
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const button =
    "inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";

  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id={`${id}-heading`} className="text-2xl">
          {label} <span className="ml-1 font-sans text-sm text-white/55">{count}</span>
        </h2>
        <div className={canPrev || canNext ? "hidden gap-2 sm:flex" : "hidden"}>
          <button type="button" className={button} onClick={() => scroll(-1)} disabled={!canPrev} aria-controls={`${id}-row`} aria-label={`Previous ${label.toLowerCase()}`}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className={button} onClick={() => scroll(1)} disabled={!canNext} aria-controls={`${id}-row`} aria-label={`More ${label.toLowerCase()}`}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <ul
        id={`${id}-row`}
        ref={scroller}
        className="rs-hscroll -mx-1 scroll-px-1 px-1 pt-1 pb-2"
      >
        {children}
      </ul>
    </section>
  );
}

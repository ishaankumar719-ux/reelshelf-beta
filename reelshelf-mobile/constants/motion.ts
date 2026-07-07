// ReelShelf Mobile — motion design tokens
// Phase 4: mirrors web's .rs-card-hover (0.2s ease) and rs-fade-in (0.3s ease-out)
// in a mobile-native form. All durations in milliseconds.

export const Motion = {
  duration: {
    fast:   150,
    medium: 220,
    slow:   380,
  },

  bezier: {
    enter: [0.16, 1, 0.3, 1] as const,
  },

  lift: {
    // Sprint 4: PosterCard "collectible" lift on touch (was 0.96 depress — direction reversed)
    scaleActive:  1.03 as number,
    // Sprint 4: large-card natural depress on press-in (ContinueWatching, DailyReel, BookOfWeek)
    depressScale: 0.97 as number,
  },

  header: {
    fadeScrollStart:  0,
    fadeScrollEnd:    70,
    minOpacity:       0.82 as number,
    translateYOffset: -4  as number,
  },

  section: {
    translateY: 14,
    duration:   380,
  },

  // Retired Sprint 2 — Hero.tsx deleted. Tokens kept to avoid removing from `as const` object.
  hero: {
    parallaxFactor: 0.30 as number,
    contentFadeAt:  0.45 as number,
    contentDriftY: -20  as number,
  },
} as const;

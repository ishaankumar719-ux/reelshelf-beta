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

  // Discover Phase 3: calm, near-zero-overshoot spring configs.
  // Every damping value below was raised until damping ratio ≈ 0.93–0.97
  // (critically damped is 1.0) — stiffness/mass kept close to Sprint 4 values
  // so the *timing* feel is unchanged, only the bounce is removed.
  // Used by `usePressLift` (hooks/usePressLift.ts) — the single press/lift
  // primitive shared by every card type on Discover.
  spring: {
    liftIn:     { damping: 26, stiffness: 260, mass: 0.7 } as const,
    liftOut:    { damping: 22, stiffness: 200, mass: 0.7 } as const,
    depressIn:  { damping: 28, stiffness: 260, mass: 0.8 } as const,
    depressOut: { damping: 24, stiffness: 200, mass: 0.8 } as const,
    searchIn:   { damping: 26, stiffness: 300, mass: 0.6 } as const,
    searchOut:  { damping: 22, stiffness: 220, mass: 0.6 } as const,
    // RandomDiscoveryCard shuffle-result reveal (scale 0.88 → 1)
    shuffleReveal: { damping: 26, stiffness: 180, mass: 1 } as const,
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

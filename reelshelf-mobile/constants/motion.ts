// ReelShelf Mobile — motion design tokens
// Phase 4: mirrors web's .rs-card-hover (0.2s ease) and rs-fade-in (0.3s ease-out)
// in a mobile-native form. All durations in milliseconds.
//
// Easing: store bezier control-point tuples here; construct Easing.bezier() at use-site
// so this file stays free of react-native-reanimated imports.

export const Motion = {
  duration: {
    fast:   150,  // button/chip press feedback — mirrors web rs-btn-press 0.1s
    medium: 220,  // card press spring — mirrors web rs-card-hover 0.2s
    slow:   380,  // section entrance fade — mirrors web rs-fade-in 0.3s
  },

  /** Bezier control-points — pass to Easing.bezier(…spread) in Reanimated */
  bezier: {
    /** Soft spring ease-out for entrances: cubic-bezier(0.16, 1, 0.3, 1) */
    enter: [0.16, 1, 0.3, 1] as const,
  },

  /** Poster card press lift — mirrors web .rs-card-hover:active scale(0.99) */
  lift: {
    scaleActive: 0.96 as number,
  },

  /** Header opacity fade on scroll — mobile-original (no web equivalent) */
  header: {
    /** Vertical scroll offset (px) where fade begins */
    fadeScrollStart: 0,
    /** Vertical scroll offset (px) where header reaches minimum opacity */
    fadeScrollEnd: 70,
    /** Minimum opacity — keeps header glanceable without being opaque */
    minOpacity: 0.82 as number,
    /** Subtle upward drift (px) as header recedes */
    translateYOffset: -4 as number,
  },

  /** Section reveal entrance — mobile-original editorial entrance effect */
  section: {
    translateY: 14,   // initial downward offset before reveal
    duration:   380,
  },
} as const;

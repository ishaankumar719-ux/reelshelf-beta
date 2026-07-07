import { Platform } from 'react-native';

// ── ReelShelf design tokens — mirrors web app CSS custom properties ────────────
// Accent hex sourced from --rs-accent-primary in the web app's globals.css.
export const RS = {
  colors: {
    // Sprint 4: tightened tonal palette — warm near-black, not blue-shifted
    base:          '#070707',           // --rs-surface-base  (Sprint 4: was #07070b)
    card:          '#101014',           // --rs-surface-card  (Sprint 4: was #0d0d14)
    elevated:      '#14141B',           // --rs-surface-elevated / search surface (Sprint 4: was #131320)
    accent:        '#1d9e75',           // --rs-accent-primary — ACTION ONLY (buttons, active states, progress)
    border:        'rgba(255,255,255,0.08)',
    textPrimary:   'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.55)',
    textMuted:     'rgba(255,255,255,0.32)',
    // Gold — EDITORIAL MOMENTS ONLY per PRODUCT_BIBLE.md ("Gold only appears for editorial moments").
    // Not yet used on mobile — define usage (e.g. ranked badges, editorial callouts) before introducing.
    // Sourced from web app's ranked-badge rgba(251,191,36,...) — Tailwind amber-400.
    gold:          '#fbbf24',
    goldMuted:     'rgba(251,191,36,0.15)',
    accentGlow:    'rgba(29,158,117,0.10)',
    // Phase 3: matches --rs-border-strong in web globals.css
    borderStrong:  'rgba(255,255,255,0.18)',
  },
  typography: {
    display:    36,
    heading:    20,
    subheading: 15,
    body:       14,
    caption:    11,
    overline:   10,
  },
  spacing: {
    xs:   4,
    sm:   8,
    md:   16,
    lg:   24,
    xl:   40,
    xxl:  56,
    xxxl: 72,
  },
  letterSpacing: {
    tight:   -0.4,
    normal:   0,
    wide:     0.8,
    widest:   1.4,
  },
  button: {
    radius:          100,
    filledBg:        '#1d9e75',               // action — THE one solid button per screen
    filledText:      '#ffffff',
    primaryFill:     'rgba(29,158,117,0.10)',  // action — outlined button tint
    primaryBorder:   'rgba(29,158,117,0.55)',  // action — outlined button border
    primaryText:     '#1d9e75',                // action — outlined button label
    secondaryBorder: 'rgba(255,255,255,0.14)',
    secondaryText:   'rgba(255,255,255,0.55)',
    paddingV:         10,
    paddingH:         20,
  },
  glass: {
    surface: 'rgba(13,13,20,0.88)',       // Android BlurView fallback
    border:  'rgba(255,255,255,0.10)',    // soft glass edge
  },
  blur: {
    tabBar:   65,   // Sprint 4: slightly more intense for floating pill (was 55)
    cardInfo:  25,
    cardLight: 18,
    search:    22,   // Sprint 4: search bar glass intensity
  },
  card: {
    posterWidth:        100,
    posterHeight:       150,
    trendingWidth:      120,
    trendingHeight:     178,
    radius:              14,
    cwHeight:            96,
    cwThumbWidth:       160,   // Sprint 4: enlarged from 128 for larger artwork presence
    featWidth:          220,
    featHeight:         300,
    featuredArtHeight:  300,
  },
  badge: {
    pillRadius: 100,
    film: { bg: 'rgba(29,78,216,0.30)',  text: '#93c5fd', label: 'FILM'  },
    tv:   { bg: 'rgba(109,40,217,0.30)', text: '#c4b5fd', label: 'TV'    },
    book: { bg: 'rgba(217,119,6,0.30)',  text: '#fcd34d', label: 'BOOK'  },
    // Sprint 4: neutral — BETA badge is a label, not an action state; accent removed
    beta: { bg: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.65)', label: 'BETA' },
  },
  // Sprint 4: soft "float" shadow — near-invisible, high blur radius, minimal Y-offset
  // Replaces prior heavy shadows on all card surfaces.
  shadow: {
    color:   '#000000',
    offsetY: 3,     // was 4
    opacity: 0.20,  // was 0.40 — much softer, near-invisible
    radius:  24,    // was 8 — high blur for floating feel
    android: 5,     // was 8
  },
  gradient: {
    heroFrom:  '#101014',
    heroTo:    '#070707',
    featFilm:  '#0f1628',
    featTv:    '#1a0f28',
    featBook:  '#1a1008',
  },
  // Sprint 4: floating tab bar geometry
  tabBar: {
    floatingHeight:    64,
    floatingMarginH:   16,
    floatingMarginB:   16,
    floatingRadius:    32,
    contentBottomPad:  96,   // scroll paddingBottom when tab bar is position:absolute
  },
} as const;

// ── Backward-compat — ThemedText / ThemedView ──────────────────────────────────
const tintColorLight = '#0a7ea4';
const tintColorDark  = RS.colors.accent;

export const Colors = {
  light: {
    text:             '#11181C',
    background:       '#fff',
    tint:             tintColorLight,
    icon:             '#687076',
    tabIconDefault:   '#687076',
    tabIconSelected:  tintColorLight,
  },
  dark: {
    text:             RS.colors.textPrimary,
    background:       RS.colors.base,
    tint:             tintColorDark,
    icon:             RS.colors.textMuted,
    tabIconDefault:   RS.colors.textMuted,
    tabIconSelected:  tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

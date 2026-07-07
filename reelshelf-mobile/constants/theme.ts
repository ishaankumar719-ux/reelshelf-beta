import { Platform } from 'react-native';

// ── ReelShelf design tokens — mirrors web app CSS custom properties ────────────
// Accent hex sourced from --rs-accent-primary in the web app's globals.css.
export const RS = {
  colors: {
    base:          '#07070b',           // --rs-surface-base
    card:          '#0d0d14',           // --rs-surface-card
    elevated:      '#131320',           // --rs-surface-elevated
    accent:        '#1d9e75',           // --rs-accent-primary
    border:        'rgba(255,255,255,0.08)',
    textPrimary:   'rgba(255,255,255,0.92)',
    textSecondary: 'rgba(255,255,255,0.55)',
    textMuted:     'rgba(255,255,255,0.32)',
    // ── Phase 2 additions ──────────────────────────────────────────────────────
    // Gold sourced from web app's ranked-badge rgba(251,191,36,...) — Tailwind amber-400.
    gold:          '#fbbf24',
    goldMuted:     'rgba(251,191,36,0.15)',
    accentGlow:    'rgba(29,158,117,0.10)',
    // Phase 3: matches --rs-border-strong in web globals.css
    borderStrong:  'rgba(255,255,255,0.18)',
  },
  typography: {
    // ── Editorial display scale ────────────────────────────────────────────
    display:    32,   // hero heading — use Fonts.serif, weight 800
    heading:    20,   // section headers — sans, weight 700
    subheading: 15,   // editorial deck / section subtitle — sans, weight 500
    body:       14,   // standard body copy — sans, weight 400
    caption:    11,   // metadata, badges, chips — sans, weight 600
    overline:   10,   // uppercase label above headings — sans, weight 700, tracked
  },
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  40,
    xxl: 56,   // between major Home screen sections (editorial breathing room)
  },
  card: {
    posterWidth:   100,
    posterHeight:  150,   // ~2:3 poster aspect ratio
    radius:         10,   // matches --rs-radius-card: 10px in web globals.css
    cwHeight:       96,
    cwThumbWidth:  128,
    // Phase 2+: featured carousel cards
    featWidth:     200,
    featHeight:    280,
  },
  // ── Badge pill tokens (media-type + BETA) ──────────────────────────────────
  badge: {
    pillRadius: 100,
    film: { bg: 'rgba(29,78,216,0.30)',  text: '#93c5fd', label: 'FILM'  },
    tv:   { bg: 'rgba(109,40,217,0.30)', text: '#c4b5fd', label: 'TV'    },
    book: { bg: 'rgba(217,119,6,0.30)',  text: '#fcd34d', label: 'BOOK'  },
    beta: { bg: '#1d9e75',               text: '#ffffff', label: 'BETA'  },
  },
  // ── Card elevation (iOS shadow / Android elevation) ────────────────────────
  shadow: {
    color:   '#000000',
    offsetY: 4,
    opacity: 0.40,
    radius:  8,
    android: 8,
  },
  // ── Gradient color stops — reserved for expo-linear-gradient (Phase 3) ─────
  // expo-linear-gradient is NOT installed in Phase 2. Solid-color fallbacks used instead.
  gradient: {
    heroFrom:  '#0d0d14',   // card — top of hero
    heroTo:    '#07070b',   // base — bottom of hero
    featFilm:  '#0f1628',   // dark-blue bg for film featured cards
    featTv:    '#1a0f28',   // dark-purple bg for TV featured cards
    featBook:  '#1a1008',   // dark-amber bg for book featured cards
  },
} as const;

// ── Existing Colors kept for backward-compat with ThemedText / ThemedView ─────
// Dark palette updated to use RS tokens so themed components follow the design system.
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
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

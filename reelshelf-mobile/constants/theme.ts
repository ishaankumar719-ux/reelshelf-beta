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
  },
  typography: {
    display:  32,
    heading:  20,
    body:     14,
    caption:  11,
  },
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  40,
  },
  card: {
    posterWidth:   100,
    posterHeight:  150,   // ~2:3 poster aspect ratio
    radius:          8,
    cwHeight:       96,
    cwThumbWidth:  128,
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

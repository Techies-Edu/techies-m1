import { Platform } from 'react-native';

/**
 * Typography scale with Serif Display headings and clean Sans-Serif body.
 */
export const typography = {
  // ── Font Families ────────────────────────────────────────────────
  serif: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  sans: Platform.OS === 'ios' ? 'System' : 'sans-serif',

  // ── Sizes ─────────────────────────────────────────────────────────
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 23,
  xxl: 28,
  xxxl: 36,

  // ── Weights ────────────────────────────────────────────────────────
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

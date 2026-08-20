/**
 * MeshConnect Neo-Brutalist Light & Dark Color Palettes.
 */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardBorder: string;
  black: string;
  white: string;
  purple: string;
  blue: string;
  green: string;
  yellow: string;
  orange: string;
  pink: string;
  primary: string;
  primaryDim: string;
  secondary: string;
  secondaryDim: string;
  success: string;
  successDim: string;
  warning: string;
  warningDim: string;
  error: string;
  errorDim: string;
  connected: string;
  connecting: string;
  disconnected: string;
  failed: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  divider: string;
  isDark: boolean;
}

export const lightColors: ThemeColors = {
  background: '#F4F3FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  black: '#1E1B4B',
  white: '#FFFFFF',
  purple: '#818CF8',
  blue: '#60A5FA',
  green: '#7BE09B',
  yellow: '#FEE57E',
  orange: '#FB923C',
  pink: '#FF94A4',
  primary: '#4F46E5',
  primaryDim: '#EEECFE',
  secondary: '#FDECDA',
  secondaryDim: '#FFF5EA',
  success: '#7BE09B',
  successDim: '#ECFDF5',
  warning: '#FEE57E',
  warningDim: '#FEFCE8',
  error: '#FF94A4',
  errorDim: '#FFF1F2',
  connected: '#7BE09B',
  connecting: '#FEE57E',
  disconnected: '#E5E7EB',
  failed: '#FF94A4',
  textPrimary: '#1E1B4B',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textDisabled: '#9CA3AF',
  divider: '#F3F4F6',
  isDark: false,
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  card: '#1E293B',
  cardBorder: '#334155',
  black: '#F8FAFC',
  white: '#0F172A',
  purple: '#6366F1',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  orange: '#F97316',
  pink: '#EC4899',
  primary: '#6366F1',
  primaryDim: '#312E81',
  secondary: '#334155',
  secondaryDim: '#1E293B',
  success: '#10B981',
  successDim: '#064E3B',
  warning: '#F59E0B',
  warningDim: '#451A03',
  error: '#EF4444',
  errorDim: '#451212',
  connected: '#10B981',
  connecting: '#F59E0B',
  disconnected: '#475569',
  failed: '#EF4444',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textDisabled: '#64748B',
  divider: '#334155',
  isDark: true,
};

export const colors = lightColors;

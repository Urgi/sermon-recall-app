/**
 * Mobile shell aligned with the pastor admin portal (slate + sky accents).
 * Use `getRecallionColors(resolved)` so light / dark / system preferences apply.
 */

import type { ViewStyle } from 'react-native';

export type ThemePreference = 'dark' | 'light' | 'system';

export type RecallionColors = {
  bgPage: string;
  /** Soft page wash / secondary surface (streak chips, inputs). */
  bgWash: string;
  bgCard: string;
  /** Absolute gradient stops for ScreenBackdrop (top → bottom). */
  bgGradient: readonly [string, string, string];
  borderSubtle: string;
  borderInput: string;
  navy: string;
  navyMid: string;
  blue: string;
  ctaSolid: string;
  muted: string;
  progressRest: string;
  brandMarkBg: string;
  brandMarkText: string;
  /** Soft fill behind focused tab icons / selected chips. */
  accentSoft: string;
  /** Hero card accent edge (light mode) / border (dark). */
  heroAccent: string;
  /** Error text / destructive actions — tuned per theme for contrast. */
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  /** Confirmation text (saved, completed, code sent). */
  success: string;
  successSoft: string;
  /** Caution notices (church dissolved, church will be removed). */
  warning: string;
  warningSoft: string;
  warningBorder: string;
  /** Dim layer behind modals and sheets. */
  scrim: string;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetY: number;
  elevation: number;
  radiusCard: number;
  radiusMd: number;
  radiusSm: number;
  hairline: number;
  /** Status bar style for Expo */
  statusBarStyle: 'light' | 'dark';
};

const dark: RecallionColors = {
  bgPage: '#05070a',
  bgWash: '#0d131c',
  bgCard: '#0a0f18',
  bgGradient: ['#05070a', '#05070a', '#05070a'],
  /** Neutral borders — cyan reserved for CTAs / progress / focus. */
  borderSubtle: 'rgba(148, 163, 184, 0.12)',
  borderInput: 'rgba(148, 163, 184, 0.22)',
  navy: '#f8fafc',
  navyMid: '#cbd5e1',
  blue: '#38bdf8',
  ctaSolid: '#0ea5e9',
  muted: '#94a3b8',
  progressRest: '#1e293b',
  brandMarkBg: '#020617',
  brandMarkText: '#38bdf8',
  accentSoft: 'rgba(56, 189, 248, 0.14)',
  heroAccent: '#38bdf8',
  danger: '#f87171',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  dangerBorder: 'rgba(248, 113, 113, 0.45)',
  success: '#86efac',
  successSoft: 'rgba(34, 197, 94, 0.12)',
  warning: '#fde68a',
  warningSoft: 'rgba(120, 53, 15, 0.22)',
  warningBorder: 'rgba(251, 191, 36, 0.4)',
  scrim: 'rgba(0, 0, 0, 0.7)',
  shadowColor: '#000000',
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffsetY: 0,
  elevation: 0,
  radiusCard: 20,
  radiusMd: 12,
  radiusSm: 10,
  hairline: 0.5,
  statusBarStyle: 'light',
};

/** Daylight paper + cool sky — crisp ink, soft depth (no warm/pink casts). */
const light: RecallionColors = {
  bgPage: '#eef3f8',
  bgWash: '#e2ebf4',
  bgCard: '#ffffff',
  bgGradient: ['#eef3f8', '#eef3f8', '#eef3f8'],
  borderSubtle: 'rgba(15, 40, 70, 0.08)',
  borderInput: 'rgba(15, 40, 70, 0.14)',
  navy: '#0b1f33',
  navyMid: '#2a4058',
  blue: '#0369a1',
  ctaSolid: '#0284c7',
  muted: '#5b6f86',
  progressRest: '#c5d4e4',
  brandMarkBg: '#ffffff',
  brandMarkText: '#0369a1',
  accentSoft: 'rgba(3, 105, 161, 0.1)',
  heroAccent: '#0284c7',
  danger: '#b91c1c',
  dangerSoft: 'rgba(254, 226, 226, 0.7)',
  dangerBorder: 'rgba(185, 28, 28, 0.28)',
  success: '#15803d',
  successSoft: 'rgba(34, 197, 94, 0.12)',
  warning: '#92400e',
  warningSoft: '#fffbeb',
  warningBorder: 'rgba(217, 119, 6, 0.35)',
  scrim: 'rgba(15, 23, 42, 0.45)',
  shadowColor: '#0b1f33',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffsetY: 6,
  elevation: 3,
  radiusCard: 22,
  radiusMd: 14,
  radiusSm: 12,
  hairline: 0.5,
  statusBarStyle: 'dark',
};

/** @deprecated Use `useRecallionTheme().colors` instead. */
export const recallion = dark;

export function resolveThemePreference(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null,
): 'light' | 'dark' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'light' ? 'light' : 'dark';
}

export function getRecallionColors(resolved: 'light' | 'dark'): RecallionColors {
  return resolved === 'light' ? light : dark;
}

/** Soft card elevation — meaningful in bright mode, no-op in dark. */
export function cardShadowStyle(c: RecallionColors): ViewStyle {
  if (c.elevation <= 0) {
    return {};
  }
  return {
    shadowColor: c.shadowColor,
    shadowOpacity: c.shadowOpacity,
    shadowRadius: c.shadowRadius,
    shadowOffset: { width: 0, height: c.shadowOffsetY },
    elevation: c.elevation,
  };
}

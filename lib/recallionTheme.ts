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
  /** Soft brand glow behind the top of each screen (top → transparent). */
  glow: readonly [string, string];
  /** Warm second accent — streaks, completed days, celebration. Cyan stays for "do this next". */
  gold: string;
  goldSoft: string;
  goldBorder: string;
  /** Icon / text drawn on a solid gold fill. */
  onGold: string;
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
  /** Three clear steps: page → card → raised, so surfaces read as layers. */
  bgPage: '#070b12',
  bgWash: '#162131',
  bgCard: '#0f1724',
  bgGradient: ['#0b1626', '#070b12', '#070b12'],
  /** Neutral borders — cyan reserved for CTAs / progress / focus. */
  borderSubtle: 'rgba(148, 163, 184, 0.14)',
  borderInput: 'rgba(148, 163, 184, 0.24)',
  navy: '#f8fafc',
  navyMid: '#cbd5e1',
  blue: '#38bdf8',
  ctaSolid: '#0ea5e9',
  muted: '#94a3b8',
  progressRest: '#223047',
  brandMarkBg: '#020617',
  brandMarkText: '#38bdf8',
  accentSoft: 'rgba(56, 189, 248, 0.14)',
  heroAccent: '#38bdf8',
  glow: ['rgba(14, 165, 233, 0.16)', 'rgba(7, 11, 18, 0)'],
  gold: '#f5b544',
  goldSoft: 'rgba(245, 181, 68, 0.14)',
  goldBorder: 'rgba(245, 181, 68, 0.38)',
  onGold: '#1b1405',
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
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffsetY: 8,
  elevation: 6,
  radiusCard: 20,
  radiusMd: 12,
  radiusSm: 10,
  hairline: 0.5,
  statusBarStyle: 'light',
};

/** Warm paper page + white cards, navy ink and sky accents. */
const light: RecallionColors = {
  bgPage: '#f6f4ef',
  bgWash: '#edeae2',
  bgCard: '#ffffff',
  bgGradient: ['#e8f1f8', '#f6f4ef', '#f6f4ef'],
  borderSubtle: 'rgba(30, 41, 59, 0.08)',
  borderInput: 'rgba(30, 41, 59, 0.16)',
  navy: '#0b1f33',
  navyMid: '#2a4058',
  blue: '#0369a1',
  ctaSolid: '#0284c7',
  muted: '#5b6f86',
  progressRest: '#ddd8cc',
  brandMarkBg: '#ffffff',
  brandMarkText: '#0369a1',
  accentSoft: 'rgba(3, 105, 161, 0.1)',
  heroAccent: '#0284c7',
  glow: ['rgba(2, 132, 199, 0.1)', 'rgba(246, 244, 239, 0)'],
  gold: '#a8670f',
  goldSoft: 'rgba(217, 119, 6, 0.12)',
  goldBorder: 'rgba(217, 119, 6, 0.3)',
  onGold: '#ffffff',
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
  shadowOpacity: 0.07,
  shadowRadius: 16,
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

/**
 * Mobile shell aligned with the pastor admin portal (slate + sky accents).
 * Use `getRecallionColors(resolved)` so light / dark / system preferences apply.
 */

export type ThemePreference = 'dark' | 'light' | 'system';

export type RecallionColors = {
  bgPage: string;
  bgCard: string;
  bgWash: string;
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
  radiusCard: number;
  radiusMd: number;
  radiusSm: number;
  hairline: number;
  /** Status bar style for Expo */
  statusBarStyle: 'light' | 'dark';
};

const dark: RecallionColors = {
  bgPage: '#05070a',
  bgCard: '#0a0f18',
  bgWash: '#020617',
  borderSubtle: 'rgba(56, 189, 248, 0.12)',
  borderInput: 'rgba(56, 189, 248, 0.22)',
  navy: '#f8fafc',
  navyMid: '#cbd5e1',
  blue: '#38bdf8',
  ctaSolid: '#0ea5e9',
  muted: '#94a3b8',
  progressRest: '#1e293b',
  brandMarkBg: '#020617',
  brandMarkText: '#38bdf8',
  radiusCard: 20,
  radiusMd: 12,
  radiusSm: 10,
  hairline: 0.5,
  statusBarStyle: 'light',
};

const light: RecallionColors = {
  bgPage: '#f1f5f9',
  bgCard: '#ffffff',
  bgWash: '#e2e8f0',
  borderSubtle: 'rgba(15, 23, 42, 0.1)',
  borderInput: 'rgba(15, 23, 42, 0.16)',
  navy: '#0f172a',
  navyMid: '#334155',
  blue: '#0284c7',
  ctaSolid: '#0ea5e9',
  muted: '#64748b',
  progressRest: '#cbd5e1',
  brandMarkBg: '#f8fafc',
  brandMarkText: '#0284c7',
  radiusCard: 20,
  radiusMd: 12,
  radiusSm: 10,
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

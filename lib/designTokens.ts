import type { TextStyle, ViewStyle } from 'react-native';

import type { RecallionColors } from './recallionTheme';

/** Shared type scale for reading / journey surfaces. */
export const typeScale = {
  screenTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4 } as TextStyle,
  dayTitle: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.3 } as TextStyle,
  sectionTitle: { fontSize: 21, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 } as TextStyle,
  question: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.15 } as TextStyle,
  body: { fontSize: 18, lineHeight: 30, fontWeight: '400' } as TextStyle,
  bodyCompact: { fontSize: 17, lineHeight: 27, fontWeight: '400' } as TextStyle,
  meta: { fontSize: 14, lineHeight: 20, fontWeight: '500' } as TextStyle,
  metaSm: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.8 } as TextStyle,
  kicker: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pageX: 20,
} as const;

/** Quiet page → surface nesting without cyan rails. */
export function surfaceStyle(c: RecallionColors, elevated = false): ViewStyle {
  return {
    backgroundColor: elevated ? c.bgWash : c.bgCard,
    borderRadius: c.radiusMd,
  };
}

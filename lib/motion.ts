import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/**
 * Shared motion tokens — keep every fade / sheet / toast on the same rhythm.
 * Enter = decelerate (ease-out), exit = accelerate (ease-in) and a little faster.
 */
export const duration = {
  /** Press feedback, small state swaps. */
  fast: 140,
  /** Content fade-ins, modal exits. */
  base: 220,
  /** Modal / sheet entrances. */
  enter: 260,
  /** Stack screen fades (native-stack `animationDuration`). */
  screen: 240,
} as const;

export const easing = {
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  standard: Easing.inOut(Easing.quad),
} as const;

/** Pressed-state opacity for buttons, rows and chips. */
export const pressedOpacity = 0.86;

/** Distance (pt) sheets and content travel while fading in. */
export const enterOffset = 12;

/** Tracks the OS "Reduce Motion" setting so decorative motion can be skipped. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

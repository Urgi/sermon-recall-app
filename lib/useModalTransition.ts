import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { duration, easing, enterOffset, useReducedMotion } from './motion';

/**
 * Drives a transparent `<Modal animationType="none">` so the backdrop fades and the
 * card rises in, then both play out before the modal unmounts (no hard cut on close).
 *
 * Render `<Modal visible={mounted}>`, put `backdropStyle` on the dimmed layer and
 * `cardStyle` on the sheet.
 */
export function useModalTransition(visible: boolean) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: duration.enter,
        easing: easing.enter,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: duration.base - 40,
      easing: easing.exit,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, progress]);

  const backdropStyle = { opacity: progress };
  const cardStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [reduced ? 0 : enterOffset * 1.5, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [reduced ? 1 : 0.98, 1],
        }),
      },
    ],
  };

  return { mounted, progress, backdropStyle, cardStyle };
}

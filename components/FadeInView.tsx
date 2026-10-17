import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { duration, easing, enterOffset, useReducedMotion } from '../lib/motion';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Delay before the fade starts (ms). */
  delay?: number;
  /** Rise from slightly below while fading (default true). */
  rise?: boolean;
};

/**
 * Fades content in on mount so loaded screens and swapped steps don't pop.
 * Re-key it (`key={step}`) to replay the entrance when content changes.
 */
export function FadeInView({ children, style, delay = 0, rise = true }: Props) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: duration.base,
      delay,
      easing: easing.enter,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [rise && !reduced ? enterOffset : 0, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

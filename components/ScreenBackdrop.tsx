import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Opaque page shell with a soft brand glow behind the top of the screen.
 * Never transparent, so native chrome / prior screens cannot bleed through.
 * Children should leave their own background transparent to let the glow show.
 */
export function ScreenBackdrop({ children, style }: Props) {
  const { colors } = useRecallionTheme();
  return (
    <View style={[styles.fill, { backgroundColor: colors.bgPage }, style]}>
      <LinearGradient
        colors={colors.glow}
        style={styles.glow}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
});

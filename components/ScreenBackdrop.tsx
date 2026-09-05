import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Opaque page shell. Bright mode uses a cool paper blue — never transparent —
 * so native chrome / prior screens cannot bleed through as a pink flash.
 */
export function ScreenBackdrop({ children, style }: Props) {
  const { colors } = useRecallionTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.bgPage }, style]}>{children}</View>;
}

import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  backgroundColor: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Vertically center form content when keyboard is closed (auth screens). */
  centerContent?: boolean;
};

/**
 * Scroll + keyboard insets for form screens. Avoids the dark gap above the keyboard
 * and keeps inputs visible while typing.
 */
export function KeyboardFormScreen({
  children,
  backgroundColor,
  contentContainerStyle,
  centerContent = true,
}: Props) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={[styles.scroll, { backgroundColor }]}
          contentContainerStyle={[
            styles.scrollContent,
            centerContent && styles.scrollContentCenter,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 32,
  },
  scrollContentCenter: {
    justifyContent: 'center',
  },
});

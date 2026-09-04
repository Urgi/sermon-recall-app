import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Keyboard,
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
 * Scroll + keyboard insets for form screens. Uses ScrollView keyboard insets only
 * (no KeyboardAvoidingView) so iOS does not double-pad and bury the focused field.
 */
export function KeyboardFormScreen({
  children,
  backgroundColor,
  contentContainerStyle,
  centerContent = true,
}: Props) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={[styles.scroll, { backgroundColor }]}
        contentContainerStyle={[
          styles.scrollContent,
          centerContent && !keyboardOpen && styles.scrollContentCenter,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  scrollContentCenter: {
    justifyContent: 'center',
  },
});

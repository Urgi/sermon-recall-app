import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackdrop } from './ScreenBackdrop';

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
    /** Ride the keyboard's own curve so centered content glides up instead of snapping. */
    function animateWith(e: KeyboardEvent) {
      if (!centerContent) return;
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          Platform.OS === 'ios' && e.duration ? e.duration : 220,
          Platform.OS === 'ios' ? LayoutAnimation.Types.keyboard : LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
    }
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        animateWith(e);
        setKeyboardOpen(true);
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        animateWith(e);
        setKeyboardOpen(false);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [centerContent]);

  return (
    <ScreenBackdrop style={{ backgroundColor }}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
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
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollContentCenter: {
    justifyContent: 'center',
  },
});

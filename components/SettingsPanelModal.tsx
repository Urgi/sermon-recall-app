import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import { pressedOpacity } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';
import { useModalTransition } from '../lib/useModalTransition';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function SettingsPanelModal({ visible, title, subtitle, onClose, children }: Props) {
  const { colors, resolved } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, resolved), [colors, resolved]);
  const { t } = useI18n();
  const { mounted, backdropStyle, cardStyle } = useModalTransition(visible);

  return (
    <Modal
      animationType="none"
      transparent
      visible={mounted}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            />
          </Animated.View>
          <Animated.View style={[styles.sheet, cardStyle]} accessibilityViewIsModal>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
            >
              <View style={styles.headerRow}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={22} color={colors.navyMid} />
                </Pressable>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(c: RecallionColors, resolved: 'light' | 'dark') {
  const isDark = resolved === 'dark';
  return StyleSheet.create({
    flex: { flex: 1 },
    scrim: { backgroundColor: c.scrim },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    sheet: {
      maxHeight: '90%',
      borderRadius: c.radiusCard,
      backgroundColor: isDark ? '#101826' : c.bgCard,
      borderWidth: 1,
      borderColor: isDark ? c.borderInput : 'rgba(15, 40, 70, 0.16)',
      zIndex: 1,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.55 : 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 16,
    },
    sheetBody: { padding: 22, paddingBottom: 28 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 6,
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: '700',
      color: c.navy,
      letterSpacing: -0.2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgWash,
    },
    subtitle: {
      marginBottom: 16,
      fontSize: 14,
      lineHeight: 21,
      color: c.muted,
    },
    pressed: { opacity: pressedOpacity },
  });
}

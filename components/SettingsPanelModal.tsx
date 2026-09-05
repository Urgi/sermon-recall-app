import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

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

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
            >
              <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="close-circle" size={30} color={colors.blue} />
                </Pressable>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(c: RecallionColors, resolved: 'light' | 'dark') {
  const isDark = resolved === 'dark';
  return StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    sheet: {
      maxHeight: '90%',
      borderRadius: 16,
      backgroundColor: isDark ? '#121a28' : c.bgCard,
      borderWidth: isDark ? 1.5 : 1,
      borderColor: isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(15, 40, 70, 0.16)',
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
    closeBtn: { marginLeft: 4 },
    subtitle: {
      marginBottom: 16,
      fontSize: 14,
      lineHeight: 21,
      color: c.muted,
    },
    pressed: { opacity: 0.85 },
  });
}

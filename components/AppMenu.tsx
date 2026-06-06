import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

type MenuItem = {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export function AppMenu() {
  const { signOut } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  function confirmSignOut() {
    closeMenu();
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await signOut();
            router.replace('/login');
          })();
        },
      },
    ]);
  }

  const items: MenuItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      onPress: () => {
        closeMenu();
        router.push('/settings');
      },
    },
    {
      key: 'signout',
      label: 'Sign out',
      onPress: confirmSignOut,
      destructive: true,
    },
  ];

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu" size={26} color={colors.navy} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.sheetWrap}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Menu</Text>
              {items.map((item, index) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.item,
                    index < items.length - 1 && styles.itemBorder,
                    pressed && styles.pressed,
                  ]}
                  onPress={item.onPress}
                >
                  <Text style={[styles.itemLabel, item.destructive && styles.itemDestructive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
                onPress={closeMenu}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    trigger: {
      padding: 8,
      marginRight: -4,
    },
    pressed: { opacity: 0.75 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 56,
      paddingRight: 16,
    },
    sheetWrap: {
      maxWidth: 260,
      width: '100%',
    },
    sheet: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusMd,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      overflow: 'hidden',
    },
    sheetTitle: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
      fontSize: 13,
      fontWeight: '600',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    item: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    itemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderSubtle,
    },
    itemLabel: {
      fontSize: 17,
      color: c.navy,
      fontWeight: '500',
    },
    itemDestructive: {
      color: '#f87171',
    },
    cancelBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderSubtle,
      alignItems: 'center',
    },
    cancelLabel: {
      fontSize: 17,
      color: c.muted,
      fontWeight: '500',
    },
  });
}

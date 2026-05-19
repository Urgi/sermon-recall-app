import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import type { RecallionColors, ThemePreference } from '../../lib/recallionTheme';

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'dark', label: 'Dark', description: 'Deep slate background (default).' },
  { value: 'light', label: 'Bright', description: 'Light background for daytime reading.' },
  { value: 'system', label: 'System', description: 'Follow your device appearance.' },
];

export default function SettingsScreen() {
  const { colors, preference, resolved, setPreference } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, resolved), [colors, resolved]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionHint}>Currently using {resolved} mode on this device.</Text>

        {OPTIONS.map((opt) => {
          const selected = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: RecallionColors, resolved: 'light' | 'dark') {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgPage },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
    backLabel: { fontSize: 16, color: colors.blue, fontWeight: '500' },
    title: { marginTop: 4, fontSize: 28, fontWeight: '700', color: colors.navy },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: '600', color: colors.navy },
    sectionHint: { marginTop: 6, marginBottom: 16, fontSize: 15, color: colors.muted, lineHeight: 22 },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
      padding: 16,
      borderRadius: colors.radiusMd,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgCard,
    },
    optionSelected: {
      borderColor: colors.blue,
      backgroundColor: resolved === 'light' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(56, 189, 248, 0.1)',
    },
    radio: {
      marginTop: 3,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.muted,
    },
    radioSelected: { borderColor: colors.blue, backgroundColor: colors.blue },
    optionText: { flex: 1 },
    optionLabel: { fontSize: 16, fontWeight: '600', color: colors.navy },
    optionDesc: { marginTop: 4, fontSize: 14, color: colors.muted, lineHeight: 20 },
    pressed: { opacity: 0.85 },
  });
}

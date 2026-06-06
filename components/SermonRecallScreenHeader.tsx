import { router } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

/** Back control + brand mark for sermon and devotional reading screens. */
export function SermonRecallScreenHeader() {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <View style={styles.brandRow}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.mark}
          accessibilityLabel=""
          importantForAccessibility="no"
        />
        <View style={styles.wordmark} accessibilityRole="header">
          <Text style={styles.sermon}>Sermon</Text>
          <Text style={styles.recall}>Recall</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 14,
    },
    backBtn: {
      alignSelf: 'flex-start',
      marginBottom: 14,
    },
    back: {
      fontSize: 14,
      color: c.blue,
      fontWeight: '500',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    mark: {
      width: 46,
      height: 46,
      borderRadius: 11,
    },
    wordmark: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 5,
    },
    sermon: {
      fontSize: 24,
      fontWeight: '600',
      color: c.navy,
      letterSpacing: -0.4,
    },
    recall: {
      fontSize: 24,
      fontWeight: '600',
      color: c.blue,
      letterSpacing: -0.4,
    },
  });
}

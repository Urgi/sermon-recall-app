import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  visible: boolean;
  streakCount: number;
  completedToday: boolean;
  onContinue: () => void;
};

const PARTICLE_COUNT = 12;

function ParticleBurst({
  progress,
  index,
  color,
}: {
  progress: Animated.Value;
  index: number;
  color: string;
}) {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
  const radius = 72 + (index % 3) * 18;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * radius],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * radius],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.2, 1, 0.35],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export function StreakCelebration({ visible, streakCount, completedToday, onContinue }: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const backdrop = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.82)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const numberScale = useRef(new Animated.Value(0.4)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      backdrop.setValue(0);
      cardScale.setValue(0.82);
      cardOpacity.setValue(0);
      numberScale.setValue(0.4);
      iconPulse.setValue(0);
      ringScale.setValue(0.6);
      ringOpacity.setValue(0);
      burst.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.spring(numberScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(burst, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(iconPulse, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(iconPulse, {
              toValue: 0,
              duration: 900,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          { iterations: 2 },
        ),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.35,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    visible,
    backdrop,
    burst,
    cardOpacity,
    cardScale,
    iconPulse,
    numberScale,
    ringOpacity,
    ringScale,
  ]);

  const iconScale = iconPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const subtitle = completedToday
    ? 'You showed up today. Keep listening, remembering, growing.'
    : 'Complete today\'s reading to keep your streak going.';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onContinue}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={styles.backdropPress} onPress={onContinue} />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={styles.burstWrap} pointerEvents="none">
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
              <ParticleBurst key={i} progress={burst} index={i} color={colors.blue} />
            ))}
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: colors.blue,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          </View>

          <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
            <Ionicons name="book" size={34} color={colors.blue} />
          </Animated.View>

          <Animated.Text style={[styles.count, { transform: [{ scale: numberScale }] }]}>
            {streakCount}
          </Animated.Text>
          <Text style={styles.label}>{streakCount === 1 ? 'day streak' : 'day streak'}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onContinue}
          >
            <Text style={styles.buttonLabel}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  burstWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 2,
  },
});

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    backdropPress: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      borderWidth: 1,
      borderColor: c.blue,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 22,
      alignItems: 'center',
      overflow: 'hidden',
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: c.bgWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    count: {
      fontSize: 56,
      fontWeight: '800',
      color: c.navy,
      letterSpacing: -1,
      lineHeight: 60,
    },
    label: {
      marginTop: 2,
      fontSize: 18,
      fontWeight: '600',
      color: c.blue,
      textTransform: 'lowercase',
    },
    subtitle: {
      marginTop: 14,
      fontSize: 15,
      lineHeight: 22,
      color: c.muted,
      textAlign: 'center',
    },
    button: {
      marginTop: 22,
      alignSelf: 'stretch',
      backgroundColor: c.blue,
      borderRadius: c.radiusMd,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonPressed: { opacity: 0.92 },
    buttonLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: '#05070a',
    },
  });
}

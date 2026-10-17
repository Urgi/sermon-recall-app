import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import { duration, easing, pressedOpacity, useReducedMotion } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  visible: boolean;
  streakCount: number;
  completedToday: boolean;
  onContinue: () => void;
};

const PARTICLE_COUNT = 12;

const staticStyles = StyleSheet.create({
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
        staticStyles.particle,
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
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const numberScale = useRef(new Animated.Value(0.6)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    setMounted(true);
    backdrop.setValue(0);
    card.setValue(0);
    numberScale.setValue(reduced ? 1 : 0.6);
    iconPulse.setValue(0);
    ring.setValue(0);
    burst.setValue(0);

    const entrance = Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: duration.enter,
        easing: easing.enter,
        useNativeDriver: true,
      }),
      reduced
        ? Animated.timing(card, { toValue: 1, duration: duration.base, useNativeDriver: true })
        : Animated.spring(card, {
            toValue: 1,
            damping: 16,
            stiffness: 180,
            mass: 0.9,
            useNativeDriver: true,
          }),
    ]);
    entrance.start();
    if (reduced) return () => entrance.stop();

    /** Decorative beats: number pops, ring + particles burst once, icon breathes twice. */
    const flourish = Animated.sequence([
      Animated.delay(140),
      Animated.parallel([
        Animated.spring(numberScale, {
          toValue: 1,
          damping: 10,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 1,
          duration: 700,
          easing: easing.enter,
          useNativeDriver: true,
        }),
        Animated.timing(burst, {
          toValue: 1,
          duration: 820,
          easing: easing.enter,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(iconPulse, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(iconPulse, {
              toValue: 0,
              duration: 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          { iterations: 2 },
        ),
      ]),
    ]);
    flourish.start();
    return () => {
      entrance.stop();
      flourish.stop();
    };
  }, [visible, reduced, backdrop, burst, card, iconPulse, numberScale, ring]);

  useEffect(() => {
    if (visible || !mounted) return;
    setMounted(false);
  }, [visible, mounted]);

  /** Play the exit before telling the parent, so the card never hard-cuts away. */
  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: duration.base - 40,
        easing: easing.exit,
        useNativeDriver: true,
      }),
      Animated.timing(card, {
        toValue: 0,
        duration: duration.base - 40,
        easing: easing.exit,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false);
      onContinue();
    });
  }

  const cardScale = card.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 1 : 0.88, 1] });
  const cardOpacity = card.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  const iconScale = iconPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.45] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.7, 0] });

  const subtitle = completedToday ? t('streak.celebrateDone') : t('streak.celebratePending');

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
          accessibilityViewIsModal
        >
          {reduced ? null : (
            <View style={staticStyles.burstWrap} pointerEvents="none">
              {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                <ParticleBurst key={i} progress={burst} index={i} color={colors.gold} />
              ))}
              <Animated.View
                style={[
                  staticStyles.ring,
                  {
                    borderColor: colors.gold,
                    opacity: ringOpacity,
                    transform: [{ scale: ringScale }],
                  },
                ]}
              />
            </View>
          )}

          <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
            <Ionicons name="flame" size={32} color={colors.gold} />
          </Animated.View>

          <View accessible accessibilityLabel={t('streak.count', { count: streakCount })}>
            <Animated.Text style={[styles.count, { transform: [{ scale: numberScale }] }]}>
              {streakCount}
            </Animated.Text>
            <Text style={styles.label}>
              {streakCount === 1 ? t('streak.dayStreakOne') : t('streak.dayStreak')}
            </Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={close}
            accessibilityRole="button"
          >
            <Text style={styles.buttonLabel}>{t('common.continue')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    scrim: { backgroundColor: c.scrim },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      borderWidth: 1,
      borderColor: c.borderInput,
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
      backgroundColor: c.goldSoft,
      borderWidth: 1,
      borderColor: c.goldBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    count: {
      textAlign: 'center',
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
      color: c.gold,
      textAlign: 'center',
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
      backgroundColor: c.ctaSolid,
      borderRadius: 50,
      paddingVertical: 14,
      minHeight: 52,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonPressed: { opacity: pressedOpacity },
    buttonLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: '#ffffff',
    },
  });
}

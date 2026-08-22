import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';

type Props = {
  /** Defaults to `/login`. */
  href?: string;
  label?: string;
};

/** Top-left auth navigation: ← Back to sign in */
export function AuthBackButton({ href = '/login', label = 'Back to sign in' }: Props) {
  const { colors } = useRecallionTheme();

  return (
    <Pressable
      onPress={() => {
        router.replace(href);
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.blue} />
      <Text style={[styles.label, { color: colors.blue }]}>{label}</Text>
    </Pressable>
  );
}

export function AuthBackButtonSlot(props: Props) {
  return (
    <View style={styles.slot}>
      <AuthBackButton {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingVertical: 4,
    marginLeft: -6,
  },
  pressed: { opacity: 0.7 },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

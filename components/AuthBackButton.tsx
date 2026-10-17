import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import { pressedOpacity } from '../lib/motion';

type Props = {
  /** Route to replace with. Without it: pop if possible, else `/login`. */
  href?: string;
  label?: string;
  /** In-screen back (e.g. code step → email step) instead of navigating. */
  onPress?: () => void;
};

/** Top-left auth navigation: ‹ Back to sign in */
export function AuthBackButton({ href, label, onPress }: Props) {
  const { colors } = useRecallionTheme();
  const { t } = useI18n();
  const text = label ?? t('auth.backToSignIn');

  return (
    <Pressable
      onPress={
        onPress ??
        (() => {
          if (href) router.replace(href);
          else if (router.canGoBack()) router.back();
          else router.replace('/login');
        })
      }
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.blue} />
      <Text style={[styles.label, { color: colors.blue }]}>{text}</Text>
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
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    minHeight: 44,
    marginLeft: -6,
  },
  pressed: { opacity: pressedOpacity },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

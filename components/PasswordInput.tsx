import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(
  { containerStyle, inputStyle, style, editable = true, ...rest },
  ref,
) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const canToggle = editable !== false;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput
        ref={ref}
        {...rest}
        editable={editable}
        secureTextEntry={!visible}
        style={[styles.input, inputStyle, style]}
      />
      {canToggle ? (
        <Pressable
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderInput,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingRight: 48,
      paddingVertical: 12,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgCard,
    },
    toggle: {
      position: 'absolute',
      right: 10,
      height: 44,
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    togglePressed: { opacity: 0.65 },
  });
}

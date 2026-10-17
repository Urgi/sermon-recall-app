import { StyleSheet } from 'react-native';

import { pressedOpacity } from './motion';
import type { RecallionColors } from './recallionTheme';

/** Shared look for the auth / onboarding forms (login, register, verify, join church). */
export function createAuthFormStyles(c: RecallionColors) {
  return StyleSheet.create({
    card: { alignSelf: 'stretch' },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    kicker: {
      fontSize: 12,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.blue,
      fontWeight: '700',
      marginBottom: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: c.navy,
      marginBottom: 8,
      lineHeight: 38,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 16,
      color: c.muted,
      marginBottom: 28,
      lineHeight: 24,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.navy,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: c.borderInput,
      borderRadius: 14,
      paddingHorizontal: 16,
      minHeight: 56,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgCard,
      marginBottom: 16,
    },
    codeInput: {
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: 8,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
      paddingVertical: 18,
    },
    error: { color: c.danger, fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 12 },
    notice: { color: c.success, fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 12 },
    alertBox: {
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
      borderRadius: 14,
      padding: 14,
      gap: 4,
      marginBottom: 20,
    },
    alertTitle: { fontSize: 15, fontWeight: '700', color: c.danger },
    alertBody: { fontSize: 14, lineHeight: 20, color: c.navyMid },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 16,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    buttonDisabled: {
      backgroundColor: c.bgWash,
      borderWidth: 1,
      borderColor: c.borderInput,
    },
    buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    buttonLabelDisabled: { color: c.muted },
    secondaryButton: {
      paddingVertical: 16,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
      borderWidth: 1,
      borderColor: c.blue,
      backgroundColor: c.accentSoft,
    },
    secondaryButtonDisabled: {
      borderColor: c.borderInput,
      backgroundColor: 'transparent',
    },
    secondaryButtonLabel: { color: c.blue, fontSize: 16, fontWeight: '700' },
    linkButton: {
      marginTop: 8,
      minHeight: 44,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkText: { color: c.blue, fontSize: 15, fontWeight: '600', textAlign: 'center' },
    linkTextDisabled: { color: c.muted },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 20,
      minHeight: 44,
    },
    footerPrompt: { color: c.muted, fontSize: 15 },
    footerLink: { color: c.blue, fontSize: 15, fontWeight: '700' },
    pressed: { opacity: pressedOpacity },
  });
}

export type AuthFormStyles = ReturnType<typeof createAuthFormStyles>;

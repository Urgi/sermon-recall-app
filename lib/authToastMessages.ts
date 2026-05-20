export const EMAIL_SENT_TOAST =
  'We sent a confirmation link to your email. Open it, then sign in here. Check spam if nothing arrives in a few minutes.';

export const CONFIRMED_TOAST =
  'Your email is confirmed. Taking you into the app…';

export const PASSWORD_RESET_SENT_TOAST =
  'If an account exists for that email, we sent password reset instructions. Check your inbox and spam.';

export function toastFromAuthParams(params: {
  email_sent?: string | string[];
  confirmed?: string | string[];
  error?: string | string[];
}): { message: string; variant: 'success' | 'error' } | null {
  const emailSent = param(params.email_sent);
  if (emailSent === '1') {
    return { message: EMAIL_SENT_TOAST, variant: 'success' };
  }
  const confirmed = param(params.confirmed);
  if (confirmed === '1') {
    return { message: CONFIRMED_TOAST, variant: 'success' };
  }
  const error = param(params.error);
  if (error === 'missing_auth_code') {
    return {
      message: 'This confirmation link is incomplete. Try opening the link from your email again.',
      variant: 'error',
    };
  }
  if (error === 'confirmation_failed') {
    return {
      message: 'Email confirmation failed. The link may have expired — sign in or register again.',
      variant: 'error',
    };
  }
  return null;
}

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export const EMAIL_SENT_TOAST =
  'We sent a confirmation code to your email. Enter it on the next screen. Check spam if needed.';

export const CONFIRMED_TOAST = 'Your email is confirmed. Welcome to Sermon Recall.';

export const USE_CODE_NOT_LINK_MESSAGE =
  'Email links cannot confirm your account. Open the app and enter the confirmation code from your email.';

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
  if (error === 'use_code') {
    return { message: USE_CODE_NOT_LINK_MESSAGE, variant: 'error' };
  }
  if (error === 'missing_auth_code') {
    return {
      message: 'This link is not valid for sign-in. Use the confirmation code from your email in the app.',
      variant: 'error',
    };
  }
  if (error === 'confirmation_failed' || error === 'wrong_client') {
    return { message: USE_CODE_NOT_LINK_MESSAGE, variant: 'error' };
  }
  return null;
}

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

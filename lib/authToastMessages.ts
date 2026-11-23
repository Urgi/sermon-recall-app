import { tr } from './i18n/ui';

/** Copy is resolved when called so it follows the active UI language. */
export const emailSentToast = () => tr('toast.emailSent');
export const confirmedToast = () => tr('toast.confirmed');
export const useCodeNotLinkMessage = () => tr('auth.useCodeNotLink');

export function toastFromAuthParams(params: {
  email_sent?: string | string[];
  confirmed?: string | string[];
  error?: string | string[];
}): { message: string; variant: 'success' | 'error' } | null {
  const emailSent = param(params.email_sent);
  if (emailSent === '1') {
    return { message: emailSentToast(), variant: 'success' };
  }
  const confirmed = param(params.confirmed);
  if (confirmed === '1') {
    return { message: confirmedToast(), variant: 'success' };
  }
  const error = param(params.error);
  if (
    error === 'use_code' ||
    error === 'reset_use_code' ||
    error === 'confirmation_failed' ||
    error === 'wrong_client'
  ) {
    return { message: useCodeNotLinkMessage(), variant: 'error' };
  }
  if (error === 'missing_auth_code') {
    return {
      message: tr('toast.invalidLink'),
      variant: 'error',
    };
  }
  return null;
}

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

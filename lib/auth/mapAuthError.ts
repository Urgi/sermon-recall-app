import { tr } from '../i18n/ui';

/** Maps Supabase Auth errors to user-safe copy in the active UI language (avoid leaking internals). */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return tr('err.signupsNotAllowed');
  }
  if (m.includes('user not found') || m.includes('unable to find user')) {
    return tr('err.noAccount');
  }
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
    return tr('err.emailRateLimit');
  }
  if (
    m.includes('invalid') &&
    (m.includes('otp') || m.includes('token') || m.includes('code') || m.includes('email'))
  ) {
    return tr('err.codeInvalid');
  }
  if (m.includes('expired')) {
    return tr('err.codeExpired');
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return tr('err.alreadyRegistered');
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return tr('err.network');
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return tr('err.tooMany');
  }
  return tr('err.generic');
}

/** Maps Supabase Auth errors to user-safe copy (avoid leaking internals). */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'New accounts are not allowed for that email. Try signing in instead.';
  }
  if (m.includes('user not found') || m.includes('unable to find user')) {
    return 'No account found for that email. Create an account first.';
  }
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
    return 'Too many emails sent. Wait a few minutes, then request a new code.';
  }
  if (
    m.includes('invalid') &&
    (m.includes('otp') || m.includes('token') || m.includes('code') || m.includes('email'))
  ) {
    return 'That code is incorrect or expired. Request a new one and try again.';
  }
  if (m.includes('expired')) {
    return 'That code expired. Request a new one and try again.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Sign in with a code instead.';
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return 'Something went wrong. Please try again.';
}

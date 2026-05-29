/** Maps Supabase Auth errors to user-safe copy (avoid leaking internals). */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Confirm your email first — enter the code from your email on the confirmation screen.';
  }
  if (m.includes('invalid') && (m.includes('otp') || m.includes('token'))) {
    return 'That code is incorrect or expired. Request a new one and try again.';
  }
  if (m.includes('invalid login credentials')) {
    return 'Incorrect email or password, or your email may still be waiting for confirmation.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in or reset your password.';
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return 'Something went wrong. Please try again.';
}

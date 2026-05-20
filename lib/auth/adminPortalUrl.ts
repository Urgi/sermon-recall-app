/** Pastor admin portal — confirmation links from web signup must open here, not in the app. */
export function getAdminPortalUrl(): string {
  const configured = process.env.EXPO_PUBLIC_ADMIN_SITE_URL?.trim().replace(/\/$/, '');
  return configured || 'https://admin.sermonrecall.com';
}

export const PASTOR_CONFIRM_IN_BROWSER_MESSAGE =
  'This confirmation is for the church admin website. You signed up in a browser — open the email link in Chrome or Safari (not the Sermon Recall app), or sign in at the admin portal.';

export function isLikelyCrossClientAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('pkce') ||
    m.includes('code verifier') ||
    m.includes('flow state') ||
    m.includes('invalid request') ||
    m.includes('auth code') ||
    m.includes('nonces')
  );
}

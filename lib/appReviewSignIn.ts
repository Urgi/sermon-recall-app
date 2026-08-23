/** App Store / Play review bypass — fixed email + code, no inbox required. */

export const APP_REVIEW_EMAIL =
  process.env.EXPO_PUBLIC_APP_REVIEW_EMAIL?.trim().toLowerCase() || '';

export const APP_REVIEW_CODE = process.env.EXPO_PUBLIC_APP_REVIEW_CODE?.trim() || '';

export function isAppReviewBypassConfigured(): boolean {
  return APP_REVIEW_EMAIL.length > 0 && APP_REVIEW_CODE.length >= 6;
}

export function isAppReviewEmail(email: string): boolean {
  if (!isAppReviewBypassConfigured()) return false;
  return email.trim().toLowerCase() === APP_REVIEW_EMAIL;
}

export function isAppReviewSignIn(email: string, code: string): boolean {
  if (!isAppReviewBypassConfigured()) return false;
  return isAppReviewEmail(email) && code.trim() === APP_REVIEW_CODE;
}

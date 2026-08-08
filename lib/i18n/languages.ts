/** Supported product languages (UI preference + church sermon / devotional language). */

export const APP_LANGUAGES = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'fr', label: 'French', nativeLabel: 'Français' },
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]['value'];

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'en';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'es' || value === 'fr';
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (typeof value !== 'string') return DEFAULT_APP_LANGUAGE;
  const trimmed = value.trim().toLowerCase();
  return isAppLanguage(trimmed) ? trimmed : DEFAULT_APP_LANGUAGE;
}

export function languageOptionLabel(code: AppLanguage): string {
  const opt = APP_LANGUAGES.find((o) => o.value === code);
  if (!opt) return code;
  if (code === 'en') return 'English';
  return `${opt.label} (${opt.nativeLabel})`;
}

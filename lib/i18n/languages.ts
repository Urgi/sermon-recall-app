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
  if (opt.nativeLabel === opt.label) return opt.label;
  return `${opt.label} (${opt.nativeLabel})`;
}

/** BCP 47 locale used for dates and numbers in each UI language. */
export function localeForLanguage(code: AppLanguage): string {
  if (code === 'es') return 'es-US';
  if (code === 'fr') return 'fr-CA';
  return 'en-US';
}

/** Best supported language for the phone's language setting (falls back to English). */
export function deviceAppLanguage(): AppLanguage {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase() ?? '';
    return normalizeAppLanguage(tag.split(/[-_]/)[0]);
  } catch {
    return DEFAULT_APP_LANGUAGE;
  }
}

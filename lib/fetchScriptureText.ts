import { type AppLanguage, normalizeAppLanguage } from './i18n/languages';

/**
 * Fetches passage text from bible-api.com when devotionals only store a reference.
 * English World English Bible only — skip fallback for Spanish/French so we
 * do not show an English verse under non-English church content.
 * @see https://bible-api.com/
 */
export async function fetchScripturePassage(
  reference: string,
  language?: AppLanguage | string | null,
): Promise<string | null> {
  const ref = reference.trim();
  if (!ref) return null;
  if (normalizeAppLanguage(language) !== 'en') return null;

  try {
    const res = await fetch(
      `https://bible-api.com/${encodeURIComponent(ref)}?translation=web`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { text?: string };
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) return null;

    return text.replace(/\n/g, '\n\n');
  } catch {
    return null;
  }
}

/** Prefer stored devotional text; fall back to fetched passage. */
export function resolveScriptureBody(
  storedText: string | null | undefined,
  fetchedText: string | null | undefined,
): string | null {
  const stored = storedText?.trim();
  if (stored) return stored;
  const fetched = fetchedText?.trim();
  return fetched || null;
}

/**
 * Fetches passage text from bible-api.com when devotionals only store a reference.
 * @see https://bible-api.com/
 */
export async function fetchScripturePassage(reference: string): Promise<string | null> {
  const ref = reference.trim();
  if (!ref) return null;

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

/**
 * Sequential unlock: user may open completed days (review) and exactly one “current” day —
 * the earliest incomplete day by `day_number`. Later days stay locked until prior days are done.
 */
export function accessibleDevotionalIds(
  devotionals: { id: string; day_number: number }[],
  completedIds: Set<string>,
): Set<string> {
  const sorted = [...devotionals].sort((a, b) => a.day_number - b.day_number);
  const accessible = new Set<string>();

  for (const d of sorted) {
    if (completedIds.has(d.id)) {
      accessible.add(d.id);
      continue;
    }
    accessible.add(d.id);
    break;
  }

  return accessible;
}

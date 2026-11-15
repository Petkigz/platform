/** Independent request-scoped catalogue work. No caching across visitors. */
export async function searchLessonsIfEnabled<T>(
  searching: boolean,
  enabled: () => Promise<boolean>,
  search: () => Promise<T[]>,
): Promise<{ enabled: boolean; hits: T[] }> {
  if (!searching) return { enabled: false, hits: [] };
  // A failed flag lookup has always meant the feature is off. A search itself
  // keeps its existing failure behavior; do not mask an unexpected exception.
  const on = await enabled().catch(() => false);
  return { enabled: on, hits: on ? await search() : [] };
}

/** Cards need the visible shelf; search and analytics do not need the cards. */
export async function completeCatalogueWork<Card, Hit>(
  cards: Promise<Card>,
  lessons: Promise<{ enabled: boolean; hits: Hit[] }>,
  analytics: Promise<void>,
): Promise<{ cards: Card; lessons: { enabled: boolean; hits: Hit[] } }> {
  const [cardResult, lessonResult] = await Promise.all([cards, lessons, analytics]);
  return { cards: cardResult, lessons: lessonResult };
}

/** Map every item while bounding concurrent requests; preserve input order. */
export async function mapConcurrent<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Concurrency limit must be a positive integer.');
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

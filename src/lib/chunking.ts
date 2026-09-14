export async function processInChunks<T, R>(items: T[], chunkSize: number, processor: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map(processor));
    for (const res of chunkResults) {
      if (res.status === 'fulfilled') {
        results.push(res.value);
      } else {
        console.error('Error in chunk processing:', res.reason);
      }
    }
  }
  return results;
}

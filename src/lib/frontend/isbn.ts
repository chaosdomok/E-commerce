import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';

export type { IsbnSuggestion } from '@/actions/isbn';

export async function searchIsbnSuggestions(...args: Parameters<typeof import('@/actions/isbn').searchIsbnSuggestions>): Promise<Awaited<ReturnType<typeof import('@/actions/isbn').searchIsbnSuggestions>>> {
  if (isFrontendPreview) { return []; }
  return (await import('@/actions/isbn')).searchIsbnSuggestions(...args);
}

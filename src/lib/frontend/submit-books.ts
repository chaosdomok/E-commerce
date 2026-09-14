import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';

export type { BookSubmissionItem } from '@/actions/submit-books';

export async function uploadBookCover(...args: Parameters<typeof import('@/actions/submit-books').uploadBookCover>): Promise<Awaited<ReturnType<typeof import('@/actions/submit-books').uploadBookCover>>> {
  if (isFrontendPreview) {
    return { success: false, error: PREVIEW_MESSAGE };
  }
  return (await import('@/actions/submit-books')).uploadBookCover(...args);
}

export async function submitBooksBatch(...args: Parameters<typeof import('@/actions/submit-books').submitBooksBatch>): Promise<Awaited<ReturnType<typeof import('@/actions/submit-books').submitBooksBatch>>> {
  if (isFrontendPreview) { return { error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/submit-books').submitBooksBatch>>; }
  return (await import('@/actions/submit-books')).submitBooksBatch(...args);
}

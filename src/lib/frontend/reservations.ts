import { isFrontendPreview, PREVIEW_MESSAGE } from '@/lib/preview';


export async function reserveBooks(...args: Parameters<typeof import('@/actions/reservations').reserveBooks>): Promise<Awaited<ReturnType<typeof import('@/actions/reservations').reserveBooks>>> {
  if (isFrontendPreview) { return { success: false, error: PREVIEW_MESSAGE } as Awaited<ReturnType<typeof import('@/actions/reservations').reserveBooks>>; }
  return (await import('@/actions/reservations')).reserveBooks(...args);
}

export async function cancelOwnReservation(
  ...args: Parameters<
    typeof import('@/actions/reservations').cancelOwnReservation
  >
): Promise<
  Awaited<ReturnType<typeof import('@/actions/reservations').cancelOwnReservation>>
> {
  if (isFrontendPreview) {
    return { success: false, error: PREVIEW_MESSAGE };
  }
  return (await import('@/actions/reservations')).cancelOwnReservation(...args);
}

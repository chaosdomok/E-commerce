/** Presentation only: the target backend owns reservedUntil. */
export function formatReservationExpiry(value: Date | string | null | undefined) {
  if (!value) return 'Termin dostępny w profilu';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Termin dostępny w profilu';
  return new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export type ReservationDisplayTone = 'success' | 'warning' | 'danger' | 'muted';

export function getReservationDisplayStatus(
  status: string,
  fulfillmentStatus: 'PREPARING' | 'READY',
  isExpired: boolean,
): { label: string; tone: ReservationDisplayTone; canCancel: boolean } {
  if (status === 'COMPLETED') {
    return { label: 'Zakończona', tone: 'success', canCancel: false };
  }
  if (status === 'CANCELLED') {
    return { label: 'Anulowana', tone: 'muted', canCancel: false };
  }
  if (status === 'EXPIRED' || isExpired) {
    return { label: 'Wygasła', tone: 'danger', canCancel: false };
  }
  if (status === 'ACTIVE' && fulfillmentStatus === 'READY') {
    return { label: 'Gotowe do odbioru', tone: 'success', canCancel: true };
  }
  if (status === 'ACTIVE') {
    return { label: 'W przygotowaniu', tone: 'warning', canCancel: true };
  }

  return { label: status, tone: 'muted', canCancel: false };
}

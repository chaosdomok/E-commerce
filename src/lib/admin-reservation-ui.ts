import { formatInventoryNumber } from './inventory-number';

export interface SearchableAdminReservation {
  id: string;
  code: string;
  items: Array<{ book: { inventoryNumber: number } }>;
}

export function filterAdminReservations<T extends SearchableAdminReservation>(
  reservations: T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleUpperCase('pl-PL');
  if (!normalizedQuery) return reservations;

  return reservations.filter((reservation) => {
    if (reservation.code.toLocaleUpperCase('pl-PL').includes(normalizedQuery)) {
      return true;
    }

    return reservation.items.some((item) =>
      formatInventoryNumber(item.book.inventoryNumber).includes(normalizedQuery),
    );
  });
}

export function toggleExpandedReservation(
  expandedIds: ReadonlySet<string>,
  reservationId: string,
): Set<string> {
  const next = new Set(expandedIds);
  if (next.has(reservationId)) next.delete(reservationId);
  else next.add(reservationId);
  return next;
}

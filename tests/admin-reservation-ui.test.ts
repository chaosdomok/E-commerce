import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  filterAdminReservations,
  toggleExpandedReservation,
} from '../src/lib/admin-reservation-ui';

const reservations = [
  {
    id: 'reservation-1',
    code: 'REZ-ABC123',
    items: [{ book: { inventoryNumber: 127 } }],
  },
  {
    id: 'reservation-2',
    code: 'REZ-ZYX987',
    items: [{ book: { inventoryNumber: 241 } }],
  },
];

test('wyszukiwanie rezerwacji obsługuje trim, case i fragment kodu REZ', () => {
  assert.deepEqual(
    filterAdminReservations(reservations, '  rez-abc  ').map((item) => item.id),
    ['reservation-1'],
  );
  assert.deepEqual(
    filterAdminReservations(reservations, '987').map((item) => item.id),
    ['reservation-2'],
  );
});

test('wyszukiwanie może znaleźć paczkę po logistycznym kodzie książki', () => {
  assert.deepEqual(
    filterAdminReservations(reservations, ' k-000241 ').map((item) => item.id),
    ['reservation-2'],
  );
});

test('brak dopasowania zwraca pustą listę', () => {
  assert.deepEqual(filterAdminReservations(reservations, 'REZ-NIEISTNIEJE'), []);
});

test('rozwijanie używa stabilnego id i pozwala niezależnie otworzyć kilka paczek', () => {
  let expanded = new Set<string>();
  expanded = toggleExpandedReservation(expanded, 'reservation-1');
  expanded = toggleExpandedReservation(expanded, 'reservation-2');
  assert.deepEqual([...expanded], ['reservation-1', 'reservation-2']);

  expanded = toggleExpandedReservation(expanded, 'reservation-1');
  assert.deepEqual([...expanded], ['reservation-2']);
});

test('odświeżenie danych nie wymusza ponownego montowania dashboardu', async () => {
  const pageSource = await readFile(
    new URL('../src/app/admin/page.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(pageSource, /<AdminDashboard[\s\S]*?key=/);
  assert.match(pageSource, /currentUserId=\{user\.id\}/);
});

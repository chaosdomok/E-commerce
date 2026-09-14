import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getReservationDisplayStatus } from '../src/lib/frontend/reservation-display';

test('profil rozróżnia status przygotowania od lifecycle rezerwacji', () => {
  assert.deepEqual(getReservationDisplayStatus('ACTIVE', 'PREPARING', false), {
    label: 'W przygotowaniu',
    tone: 'warning',
    canCancel: true,
  });
  assert.equal(
    getReservationDisplayStatus('ACTIVE', 'READY', false).label,
    'Gotowe do odbioru',
  );
  assert.equal(
    getReservationDisplayStatus('COMPLETED', 'READY', true).label,
    'Zakończona',
  );
  assert.equal(
    getReservationDisplayStatus('CANCELLED', 'READY', false).label,
    'Anulowana',
  );
  assert.equal(
    getReservationDisplayStatus('EXPIRED', 'READY', false).label,
    'Wygasła',
  );
});

test('detail page korzysta ze wspólnego cart store i nie renderuje direct reserve', async () => {
  const [page, cartButton, catalog, navbar] = await Promise.all([
    readFile(new URL('../src/app/book/[id]/page.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../src/components/site/book-detail-cart-button.tsx', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../src/components/site/catalog-explorer.tsx', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../src/components/site/navbar.tsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(page, /SingleBookReserveButton/);
  assert.match(page, /BookDetailCartButton/);
  for (const source of [cartButton, catalog, navbar]) {
    assert.match(source, /@\/lib\/store\/cart/);
  }
});

test('toasty mają wspólny offset navbara, limit oraz polską etykietę zamknięcia', async () => {
  const toaster = await readFile(
    new URL('../src/components/ui/app-toaster.tsx', import.meta.url),
    'utf8',
  );

  assert.match(toaster, /var\(--toast-top-offset\)/);
  assert.match(toaster, /visibleToasts=\{3\}/);
  assert.match(toaster, /Zamknij powiadomienie/);
});

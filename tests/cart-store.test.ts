import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCartAddError, type CartBook } from '../src/lib/store/cart';

const book = (overrides: Partial<CartBook> = {}): CartBook => ({
  id: 'book-1',
  title: 'Matematyka 1',
  author: 'Autor',
  price: 30,
  condition: 'DOBRY',
  course_code: 'Matematyka',
  cover_url: null,
  seller_id: 'seller-1',
  ...overrides,
});

test('koszyk odrzuca duplikat książki', () => {
  const item = book();
  assert.equal(
    getCartAddError([item], item),
    'Ten podręcznik jest już w koszyku.',
  );
});

test('koszyk odrzuca drugi podręcznik z tego samego przedmiotu niezależnie od zapisu', () => {
  assert.equal(
    getCartAddError(
      [book({ course_code: ' Matematyka ' })],
      book({ id: 'book-2', course_code: 'MATEMATYKA' }),
    ),
    'Możesz wybrać maksymalnie jeden podręcznik z danego przedmiotu.',
  );
});

test('koszyk odrzuca szesnastą pozycję i przyjmuje inny przedmiot poniżej limitu', () => {
  const fullCart = Array.from({ length: 15 }, (_, index) =>
    book({ id: `book-${index}`, course_code: `Przedmiot ${index}` }),
  );
  assert.equal(
    getCartAddError(fullCart, book({ id: 'book-16', course_code: 'Fizyka' })),
    'Koszyk może zawierać maksymalnie 15 podręczników.',
  );
  assert.equal(
    getCartAddError(
      [book()],
      book({ id: 'book-2', course_code: 'Fizyka' }),
    ),
    null,
  );
});

test('koszyk blokuje dodanie własnej książki', () => {
  assert.equal(
    getCartAddError([], book({ seller_id: 'buyer-1' }), 'buyer-1'),
    'Nie możesz dodać do koszyka własnej książki.',
  );
  assert.equal(
    getCartAddError([], book({ seller_id: 'seller-1' }), 'buyer-1'),
    null,
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFairSummary } from '../src/lib/admin-settlement';

test('podsumowanie rozdziela niewypłacone należności gotówkowe i BLIK', () => {
  const summary = calculateFairSummary([
    {
      status: 'SOLD',
      price: 36,
      basePrice: 30,
      payoutPaidAt: null,
      seller: { refundMethod: 'Gotówka w szkole' },
    },
    {
      status: 'SOLD',
      price: 28,
      basePrice: 24,
      payoutPaidAt: null,
      seller: { refundMethod: 'Przelew na telefon BLIK' },
    },
    {
      status: 'AVAILABLE',
      price: 20,
      basePrice: 17,
      payoutPaidAt: null,
      seller: { refundMethod: 'Gotówka w szkole' },
    },
  ]);

  assert.deepEqual(summary, {
    totalBooks: 3,
    catalogValue: 84,
    soldBooks: 2,
    soldValue: 64,
    sellerValue: 54,
    suMargin: 10,
    cashOutstanding: 30,
    blikOutstanding: 24,
    missingBasePrice: 0,
    unclassifiedOutstanding: 0,
  });
});

test('podsumowanie nie zgaduje brakującej ceny bazowej ani nietypowej wypłaty', () => {
  const summary = calculateFairSummary([
    {
      status: 'SOLD',
      price: 40,
      basePrice: null,
      payoutPaidAt: null,
      seller: { refundMethod: 'Gotówka w szkole' },
    },
    {
      status: 'SOLD',
      price: 25,
      basePrice: 20,
      payoutPaidAt: null,
      seller: { refundMethod: 'Przelew bankowy' },
    },
  ]);

  assert.equal(summary.missingBasePrice, 1);
  assert.equal(summary.unclassifiedOutstanding, 20);
  assert.equal(summary.sellerValue, 20);
});

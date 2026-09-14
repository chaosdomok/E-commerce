import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatReservationDeadline,
  getReservationExpiry,
  getReservationLimitError,
  isAdditionalSalesDayEnabled,
} from '../src/lib/reservation-policy';

const iso = (value: Date | null) => value?.toISOString() ?? null;

test('wyznacza 12:25 następnego dnia sprzedażowego w Europe/Warsaw', () => {
  assert.equal(
    iso(getReservationExpiry(new Date('2026-09-16T20:00:00+02:00'))),
    '2026-09-17T10:25:00.000Z',
  );
  assert.equal(
    iso(getReservationExpiry(new Date('2026-09-17T08:00:00+02:00'))),
    '2026-09-18T10:25:00.000Z',
  );
  assert.equal(
    iso(getReservationExpiry(new Date('2026-09-17T13:00:00+02:00'))),
    '2026-09-18T10:25:00.000Z',
  );
});

test('uwzględnia 21 września wyłącznie po aktywacji ustawienia', () => {
  const now = new Date('2026-09-18T13:00:00+02:00');
  assert.equal(getReservationExpiry(now), null);
  assert.equal(
    iso(getReservationExpiry(now, true)),
    '2026-09-21T10:25:00.000Z',
  );
  assert.equal(isAdditionalSalesDayEnabled('true'), true);
  assert.equal(isAdditionalSalesDayEnabled('1'), true);
  assert.equal(isAdditionalSalesDayEnabled('false'), false);
});

test('formatuje termin w strefie Europe/Warsaw', () => {
  assert.equal(
    formatReservationDeadline('2026-09-18T10:25:00.000Z'),
    '18.09.2026, 12:25',
  );
});

test('egzekwuje limit 15 aktywnych rezerwacji', () => {
  const active = Array.from({ length: 15 }, () => ({ courseCode: null }));
  assert.match(
    getReservationLimitError(active, [{ courseCode: 'Matematyka' }]) ?? '',
    /maksymalnie 15/,
  );
  assert.equal(
    getReservationLimitError(active.slice(0, 14), [
      { courseCode: 'Matematyka' },
    ]),
    null,
  );
});

test('egzekwuje jedną aktywną rezerwację na przedmiot', () => {
  assert.match(
    getReservationLimitError(
      [{ courseCode: ' Matematyka ' }],
      [{ courseCode: 'matematyka' }],
    ) ?? '',
    /jedną aktywną rezerwację/,
  );
  assert.equal(
    getReservationLimitError(
      [{ courseCode: 'Matematyka' }],
      [{ courseCode: 'Fizyka' }],
    ),
    null,
  );
});

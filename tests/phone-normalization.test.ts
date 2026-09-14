import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPolishPhoneDigits,
  normalizePolishPhone,
} from '../src/lib/profile';

test('normalizuje obsługiwane zapisy polskiego numeru telefonu', () => {
  for (const value of [
    '123456789',
    '123 456 789',
    '+48123456789',
    '48 123 456 789',
  ]) {
    assert.equal(normalizePolishPhone(value), '+48 123 456 789');
  }
});

test('odrzuca nieprawidłowy numer i zwraca cyfry do formularza', () => {
  assert.equal(normalizePolishPhone('12345'), null);
  assert.equal(getPolishPhoneDigits('+48 123 456 789'), '123456789');
});

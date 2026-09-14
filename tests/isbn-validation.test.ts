import { test } from 'node:test';
import assert from 'node:assert';
import { validateAndNormalizeIsbn13 } from '@/lib/isbn-validation';

test('ISBN-13 validation', async (t) => {
  await t.test('poprawny ISBN-13 -> zwraca wyczyszczony ISBN', () => {
    // 978-3-16-148410-0 is a known valid ISBN
    assert.strictEqual(validateAndNormalizeIsbn13('9783161484100'), '9783161484100');
    assert.strictEqual(validateAndNormalizeIsbn13('978-3-16-148410-0'), '9783161484100');
    assert.strictEqual(validateAndNormalizeIsbn13('  978 3 16 148410 0  '), '9783161484100');
  });

  await t.test('błędny ISBN-13 (zła cyfra kontrolna) -> zwraca null', () => {
    // changing the last digit to 1 makes it invalid
    assert.strictEqual(validateAndNormalizeIsbn13('9783161484101'), null);
  });

  await t.test('inne formaty i błędy -> zwraca null', () => {
    assert.strictEqual(validateAndNormalizeIsbn13(null), null);
    assert.strictEqual(validateAndNormalizeIsbn13(''), null);
    assert.strictEqual(validateAndNormalizeIsbn13('123'), null); // too short
    assert.strictEqual(validateAndNormalizeIsbn13('97883267123456'), null); // too long
    assert.strictEqual(validateAndNormalizeIsbn13('ABC8326712345'), null); // letters
    assert.strictEqual(validateAndNormalizeIsbn13('978832671234X'), null); // ISBN-13 cannot end in X, only digits
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatInventoryNumber } from '../src/lib/inventory-number';

test('formatuje stabilny numer magazynowy z sześcioma cyframi', () => {
  assert.equal(formatInventoryNumber(1), 'K-000001');
  assert.equal(formatInventoryNumber(27), 'K-000027');
  assert.equal(formatInventoryNumber(1534), 'K-001534');
  assert.equal(formatInventoryNumber(1_000_000), 'K-1000000');
});

test('odrzuca niepoprawny numer magazynowy', () => {
  assert.throws(() => formatInventoryNumber(0), RangeError);
  assert.throws(() => formatInventoryNumber(1.5), RangeError);
});

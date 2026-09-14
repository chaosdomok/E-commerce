import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createConfirmationGuard,
  executeConfirmedAction,
} from '../src/lib/confirm-action';
import { parseWholePln } from '../src/lib/money';
import { calculateFinalPriceSync } from '../src/lib/pricing';

test('cena 20 jest akceptowana jako pełne PLN', () => {
  assert.deepEqual(parseWholePln(20), { success: true, value: 20 });
  assert.deepEqual(calculateFinalPriceSync(20), {
    basePrice: 20,
    markup: 5,
    finalPrice: 25,
  });
});

test('cena 20.50 jest odrzucana bez zaokrąglania', () => {
  assert.equal(parseWholePln(20.5).success, false);
  assert.throws(() => calculateFinalPriceSync(20.5), /pełnych złotych/);
});

test('cena tekstowa i NaN są odrzucane', () => {
  assert.equal(parseWholePln('nie-liczba').success, false);
  assert.equal(parseWholePln(Number.NaN).success, false);
});

test('progi narzutów zachowują dotychczasowe granice i pełne PLN', () => {
  assert.equal(calculateFinalPriceSync(10).finalPrice, 14);
  assert.equal(calculateFinalPriceSync(11).finalPrice, 16);
  assert.equal(calculateFinalPriceSync(80).finalPrice, 88);
  assert.equal(calculateFinalPriceSync(81).finalPrice, 91);
});

test('akcja bez potwierdzenia nie wykonuje się', async () => {
  let calls = 0;
  const result = await executeConfirmedAction({
    confirmed: false,
    guard: createConfirmationGuard(),
    action: () => {
      calls += 1;
    },
  });

  assert.deepEqual(result, { executed: false });
  assert.equal(calls, 0);
});

test('potwierdzona akcja wykonuje się dokładnie raz', async () => {
  let calls = 0;
  const result = await executeConfirmedAction({
    confirmed: true,
    guard: createConfirmationGuard(),
    action: () => {
      calls += 1;
      return 'ok';
    },
  });

  assert.deepEqual(result, { executed: true, value: 'ok' });
  assert.equal(calls, 1);
});

test('podwójne kliknięcie nie uruchamia operacji drugi raz', async () => {
  let calls = 0;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const guard = createConfirmationGuard();
  const action = async () => {
    calls += 1;
    await pending;
  };

  const first = executeConfirmedAction({ confirmed: true, guard, action });
  const second = await executeConfirmedAction({ confirmed: true, guard, action });
  assert.deepEqual(second, { executed: false });
  assert.equal(calls, 1);

  finish();
  assert.equal((await first).executed, true);
  assert.equal(calls, 1);
});

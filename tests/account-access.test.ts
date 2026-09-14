import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

let signOutCalls = 0;
import {
  assertAccountActiveState,
  BLOCKED_ACCOUNT_MESSAGE,
  BlockedAccountError,
} from '../src/lib/account-access-core';

beforeEach(() => {
  signOutCalls = 0;
});

test('aktywne konto przechodzi centralną kontrolę', async () => {
  await assertAccountActiveState(false, async () => {
    signOutCalls += 1;
  });
  assert.equal(signOutCalls, 0);
});

test('zablokowane konto jest odrzucane i sesja zostaje zakończona', async () => {
  await assert.rejects(
    assertAccountActiveState(true, async () => {
      signOutCalls += 1;
    }),
    (error: unknown) =>
      error instanceof BlockedAccountError &&
      error.message === BLOCKED_ACCOUNT_MESSAGE,
  );
  assert.equal(signOutCalls, 1);
});

test('nieoczekiwany błąd wylogowania nie jest wyciszany', async () => {
  const unexpected = new Error('unexpected sign-out failure');
  await assert.rejects(
    assertAccountActiveState(true, async () => {
      throw unexpected;
    }),
    (error: unknown) => error === unexpected,
  );
});

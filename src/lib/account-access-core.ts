export const BLOCKED_ACCOUNT_MESSAGE =
  'Twoje konto zostało zablokowane. Skontaktuj się z obsługą Targów Książek.';

export class BlockedAccountError extends Error {
  constructor() {
    super(BLOCKED_ACCOUNT_MESSAGE);
    this.name = 'BlockedAccountError';
  }
}

export async function assertAccountActiveState(
  isBlocked: boolean,
  signOut?: () => Promise<unknown>,
): Promise<void> {
  if (!isBlocked) return;
  await signOut?.();
  throw new BlockedAccountError();
}

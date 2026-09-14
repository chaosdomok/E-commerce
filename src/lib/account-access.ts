import 'server-only';
import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import {
  assertAccountActiveState,
  BLOCKED_ACCOUNT_MESSAGE,
  BlockedAccountError,
} from '@/lib/account-access-core';

export { BLOCKED_ACCOUNT_MESSAGE, BlockedAccountError };

export const isAccountBlocked = cache(async (userId: string): Promise<boolean> => {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { isBlocked: true },
  });

  return Boolean(profile?.isBlocked);
});

export async function assertAccountActive(
  userId: string,
  signOut?: () => Promise<unknown>,
): Promise<void> {
  await assertAccountActiveState(await isAccountBlocked(userId), signOut);
}

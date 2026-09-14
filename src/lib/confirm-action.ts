export type ConfirmationGuard = {
  running: boolean;
};

export function createConfirmationGuard(): ConfirmationGuard {
  return { running: false };
}

export async function executeConfirmedAction<T>({
  confirmed,
  guard,
  action,
}: {
  confirmed: boolean;
  guard: ConfirmationGuard;
  action: () => Promise<T> | T;
}): Promise<{ executed: false } | { executed: true; value: T }> {
  if (!confirmed || guard.running) return { executed: false };

  guard.running = true;
  try {
    return { executed: true, value: await action() };
  } finally {
    guard.running = false;
  }
}

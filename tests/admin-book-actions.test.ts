import assert from 'node:assert/strict';
import { before, beforeEach, mock, test } from 'node:test';

let currentStatus = 'AVAILABLE';
let storedCondition = 'DOBRY';
let updateData: Record<string, unknown> | null = null;
let updateCalls = 0;
let cancelledReservationStatus: string | null = null;
let releasedReservationBookIds: string[] = [];
let saleBook = {
  id: 'book-1',
  title: 'Matematyka 1',
  status: 'AVAILABLE',
  reservedByUserId: null as string | null,
  sellerId: 'seller-1',
  basePrice: 30,
  seller: {
    email: 'seller@example.test',
    fullName: 'Sprzedający',
    refundMethod: 'Gotówka w szkole',
  },
  reservationItems: [] as Array<{ reservationId: string }>,
};

const transactionClient = {
  book: {
    findUnique: async () => saleBook,
    update: async (args: { data: Record<string, unknown> }) => {
      updateCalls += 1;
      updateData = args.data;
      return { id: 'book-1' };
    },
    updateMany: async (args: {
      where: { id: string | { in: string[] } };
      data: Record<string, unknown>;
    }) => {
      if (args.data.status === 'SOLD') {
        updateCalls += 1;
        updateData = args.data;
        return { count: 1 };
      }
      if (typeof args.where.id === 'string') return { count: 0 };
      releasedReservationBookIds = args.where.id.in;
      return { count: releasedReservationBookIds.length };
    },
  },
  reservationItem: {
    count: async () => 0,
  },
  reservation: {
    updateMany: async (args: { data: { status: string } }) => {
      cancelledReservationStatus = args.data.status;
      return { count: 1 };
    },
  },
};

const prismaMock = {
  profile: {
    findUnique: async () => ({ email: 'admin@example.test', role: 'admin' }),
  },
  book: {
    findUnique: async (args: { select?: Record<string, unknown> }) =>
      args.select?.seller ? saleBook : { status: currentStatus },
    update: async (args: { data: Record<string, unknown> }) => {
      updateCalls += 1;
      updateData = args.data;
      if ('condition' in args.data && args.data.condition === null) {
        throw new Error('Argument `condition` must not be null.');
      }
      if (typeof args.data.condition === 'string') {
        storedCondition = args.data.condition;
      }
      return { id: 'book-1' };
    },
  },
  reservation: {
    findUnique: async () => ({
      id: 'reservation-1',
      code: 'REZ-GMHVVV',
      userId: 'buyer-1',
      status: 'ACTIVE',
      items: [
        { bookId: 'book-1', book: { title: 'Matematyka 1' } },
        { bookId: 'book-2', book: { title: 'Fizyka 1' } },
      ],
    }),
  },
  $transaction: async (
    callback: (client: typeof transactionClient) => Promise<unknown>,
  ) => callback(transactionClient),
};

const url = (path: string) => new URL(path, import.meta.url).href;

before(async () => {
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async () => undefined,
      BLOCKED_ACCOUNT_MESSAGE: 'Konto zablokowane.',
      BlockedAccountError: class extends Error {},
    },
  });
  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: { prisma: prismaMock },
  });
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'admin-1', email: 'admin@example.test' } },
          }),
        },
      }),
    },
  });
  mock.module(url('../src/lib/supabase/admin.ts'), {
    namedExports: {
      createSupabaseAdminClient: () => ({
        auth: {
          admin: {
            createUser: async () => ({ data: { user: null }, error: null }),
            deleteUser: async () => ({ error: null }),
          },
        },
      }),
    },
  });
  mock.module(url('../src/lib/system-notifications.ts'), {
    namedExports: { createNotification: async () => ({ success: true }) },
  });
  mock.module(url('../src/actions/pricing.ts'), {
    namedExports: {
      calculatePriceWithMarkup: async (basePrice: number) => ({
        finalPrice: basePrice + 5,
      }),
    },
  });
  mock.module(url('../src/lib/audit.ts'), {
    namedExports: { logAuditEvent: async () => null },
  });
  mock.module(url('../src/lib/email.ts'), {
    namedExports: {
      sendBookApprovedEmail: async () => ({ success: true }),
      sendBookRejectedEmail: async () => ({ success: true }),
      sendBookSoldEmail: async () => ({ success: true }),
      sendPayoutReadyEmail: async () => ({ success: true }),
      sendOfflineAccountActivationEmail: async () => ({ success: true }),
      sendReservationReadyEmail: async () => ({ success: true }),
      sendAccountBlockedEmail: async () => ({ success: true }),
    },
  });
  mock.module('next/cache', {
    namedExports: { revalidatePath: () => undefined },
  });
});

let actions: typeof import('../src/actions/admin');

before(async () => {
  actions = await import('../src/actions/admin');
});

beforeEach(() => {
  currentStatus = 'AVAILABLE';
  storedCondition = 'DOBRY';
  updateData = null;
  updateCalls = 0;
  cancelledReservationStatus = null;
  releasedReservationBookIds = [];
  saleBook = {
    id: 'book-1',
    title: 'Matematyka 1',
    status: 'AVAILABLE',
    reservedByUserId: null,
    sellerId: 'seller-1',
    basePrice: 30,
    seller: {
      email: 'seller@example.test',
      fullName: 'Sprzedający',
      refundMethod: 'Gotówka w szkole',
    },
    reservationItems: [],
  };
});

test('zmiana samego statusu nie zapisuje condition null', async () => {
  const result = await actions.updateBookData('book-1', {
    status: 'REJECTED',
    condition: null,
  });

  assert.equal(result.success, true);
  assert.equal(updateCalls, 1);
  assert.equal(storedCondition, 'DOBRY');
  assert.equal(Object.hasOwn(updateData ?? {}, 'condition'), false);
  assert.equal(updateData?.status, 'REJECTED');
});

test('zwykła edycja nie może ustawić RESERVED ani SOLD', async () => {
  assert.equal(
    (await actions.updateBookData('book-1', { status: 'RESERVED' })).success,
    false,
  );
  assert.equal(
    (await actions.updateBookData('book-1', { status: 'SOLD' })).success,
    false,
  );
  assert.equal(updateCalls, 0);
});

test('edycja admina odrzuca cenę z groszami bez aktualizacji książki', async () => {
  const result = await actions.updateBookData('book-1', { basePrice: 20.5 });
  assert.deepEqual(result, {
    success: false,
    error: 'Cena musi być podana w pełnych złotych, bez groszy.',
  });
  assert.equal(updateCalls, 0);
});

test('dedykowana akcja sprzedaży oznacza dostępną książkę jako SOLD z metodą płatności', async () => {
  const result = await actions.fulfillOrder('book-1', 'CASH');
  assert.equal(result.success, true);
  assert.deepEqual(updateData, { status: 'SOLD', paymentMethod: 'CASH' });
});

test('admin anuluje całą aktywną rezerwację i zwalnia wszystkie jej książki', async () => {
  const result = await actions.cancelReservation('reservation-1');
  assert.equal(result.success, true);
  assert.equal(cancelledReservationStatus, 'CANCELLED');
  assert.deepEqual(releasedReservationBookIds, ['book-1', 'book-2']);
});

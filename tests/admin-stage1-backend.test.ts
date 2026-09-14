import assert from 'node:assert/strict';
import { before, beforeEach, mock, test } from 'node:test';

let authUserId = 'head-1';
let authEmail = 'head@example.test';
let storedRole = 'head_admin';
let blocked = false;
let fulfillmentStatus = 'PREPARING';
let targetBlocked = false;
let targetBlockedAt: Date | null = null;
let completedStatus: string | null = null;
let failSaleBookId: string | null = null;
let soldBookIds: string[] = [];
let transactionRolledBack = false;
let reservationItemsWhere: unknown = null;
let notificationEvents: string[] = [];
let createdAuthUser: Record<string, unknown> | null = null;
let createdProfile: Record<string, unknown> | null = null;

const books = new Map([
  ['book-1', {
    id: 'book-1', title: 'Matematyka', status: 'RESERVED', reservedByUserId: 'buyer-1',
    sellerId: 'seller-1', basePrice: 20,
    seller: { email: null, fullName: 'Sprzedawca 1', refundMethod: 'Gotówka w szkole' },
    reservationItems: [{ reservationId: 'reservation-1' }],
  }],
  ['book-2', {
    id: 'book-2', title: 'Biologia', status: 'RESERVED', reservedByUserId: 'buyer-1',
    sellerId: 'seller-2', basePrice: 30,
    seller: { email: null, fullName: 'Sprzedawca 2', refundMethod: 'Gotówka w szkole' },
    reservationItems: [{ reservationId: 'reservation-1' }],
  }],
]);

const transactionClient = {
  reservation: {
    findUnique: async (args: { select?: { items?: { where?: unknown } } }) => {
      reservationItemsWhere = args.select?.items?.where ?? null;
      return {
        id: 'reservation-1',
        status: 'ACTIVE',
        items: [{ bookId: 'book-1' }, { bookId: 'book-2' }],
      };
    },
    updateMany: async (args: { data: { status: string } }) => {
      completedStatus = args.data.status;
      return { count: 1 };
    },
  },
  book: {
    findUnique: async (args: { where: { id: string } }) => books.get(args.where.id) ?? null,
    updateMany: async (args: { where: { id: string }; data: { status: string } }) => {
      if (args.where.id === failSaleBookId) throw new Error('sale failed');
      soldBookIds.push(args.where.id);
      return { count: 1 };
    },
  },
  reservationItem: { count: async () => 0 },
};

const prismaMock = {
  profile: {
    findUnique: async () => ({ email: authEmail, role: storedRole, isBlocked: blocked }),
    create: async (args: { data: Record<string, unknown> }) => {
      createdProfile = args.data;
      return args.data;
    },
    updateMany: async (args: { data: { isBlocked: boolean; blockedAt: Date | null } }) => {
      targetBlocked = args.data.isBlocked;
      targetBlockedAt = args.data.blockedAt;
      return { count: 1 };
    },
  },
  reservation: {
    findFirst: async () => ({
      id: 'reservation-1',
      code: 'REZ-ABC123',
      userId: 'buyer-1',
      user: { email: 'buyer@example.test', fullName: 'Kupujący' },
    }),
    updateMany: async (args: { data: { fulfillmentStatus: string } }) => {
      fulfillmentStatus = args.data.fulfillmentStatus;
      return { count: 1 };
    },
  },
  $transaction: async (
    callback: (client: typeof transactionClient) => Promise<unknown>,
  ) => {
    const soldSnapshot = [...soldBookIds];
    const completedSnapshot = completedStatus;
    try {
      return await callback(transactionClient);
    } catch (error) {
      soldBookIds = soldSnapshot;
      completedStatus = completedSnapshot;
      transactionRolledBack = true;
      throw error;
    }
  },
};

const url = (path: string) => new URL(path, import.meta.url).href;

before(async () => {
  process.env.HEAD_ADMIN_EMAILS = 'head@example.test';
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async () => undefined,
      BLOCKED_ACCOUNT_MESSAGE: 'Konto zablokowane.',
      BlockedAccountError: class extends Error {},
    },
  });
  mock.module(url('../src/lib/prisma.ts'), { namedExports: { prisma: prismaMock } });
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: authUserId, email: authEmail } } }),
          signOut: async () => undefined,
        },
      }),
    },
  });
  mock.module(url('../src/lib/supabase/admin.ts'), {
    namedExports: {
      createSupabaseAdminClient: () => ({
        auth: {
          admin: {
            createUser: async (payload: Record<string, unknown>) => {
              createdAuthUser = payload;
              return { data: { user: { id: 'created-user-1' } }, error: null };
            },
            deleteUser: async () => ({ error: null }),
          },
        },
      }),
    },
  });
  mock.module(url('../src/lib/system-notifications.ts'), {
    namedExports: {
      createNotification: async ({ eventKey }: { eventKey: string }) => {
        notificationEvents.push(eventKey);
        return { success: true };
      },
    },
  });
  mock.module(url('../src/actions/pricing.ts'), {
    namedExports: { calculatePriceWithMarkup: async (price: number) => ({ finalPrice: price }) },
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
  mock.module('next/cache', { namedExports: { revalidatePath: () => undefined } });
});

let actions: typeof import('../src/actions/admin');

before(async () => {
  actions = await import('../src/actions/admin');
});

beforeEach(() => {
  authUserId = 'head-1';
  authEmail = 'head@example.test';
  storedRole = 'head_admin';
  blocked = false;
  fulfillmentStatus = 'PREPARING';
  targetBlocked = false;
  targetBlockedAt = null;
  completedStatus = null;
  failSaleBookId = null;
  soldBookIds = [];
  transactionRolledBack = false;
  reservationItemsWhere = null;
  notificationEvents = [];
  createdAuthUser = null;
  createdProfile = null;
});

test('admin tworzy aktywne konto Supabase z hasłem, którego nie zapisuje w profilu', async () => {
  const formData = new FormData();
  formData.set('firstName', 'Jan');
  formData.set('lastName', 'Kowalski');
  formData.set('email', 'jan@example.test');
  formData.set('password', 'Bezpieczne123');
  formData.set('passwordConfirmation', 'Bezpieczne123');
  formData.set('accountType', 'other');

  const result = await actions.adminCreateOfflineUser(formData);

  assert.equal(result.success, true);
  assert.equal(createdAuthUser?.email, 'jan@example.test');
  assert.equal(createdAuthUser?.password, 'Bezpieczne123');
  assert.equal(createdAuthUser?.email_confirm, true);
  assert.equal(createdProfile?.id, 'created-user-1');
  assert.equal(Object.hasOwn(createdProfile ?? {}, 'password'), false);
  assert.equal(JSON.stringify(createdProfile).includes('Bezpieczne123'), false);
});

test('admin zmienia PREPARING na READY tylko dla aktywnej rezerwacji', async () => {
  const result = await actions.setReservationFulfillmentStatus('reservation-1', 'READY');
  assert.equal(result.success, true);
  assert.equal(fulfillmentStatus, 'READY');
  assert.deepEqual(notificationEvents, ['reservation-ready:reservation-1']);
});

test('zwykły użytkownik nie zmienia statusu przygotowania', async () => {
  authEmail = 'user@example.test';
  storedRole = 'user';
  const result = await actions.setReservationFulfillmentStatus('reservation-1', 'READY');
  assert.equal(result.success, false);
  assert.equal(fulfillmentStatus, 'PREPARING');
});

test('head admin blokuje i odblokowuje konto, ale nie blokuje siebie', async () => {
  assert.equal((await actions.setUserBlocked('user-1', true)).success, true);
  assert.equal(targetBlocked, true);
  assert.ok(targetBlockedAt instanceof Date);
  assert.equal((await actions.setUserBlocked('user-1', false)).success, true);
  assert.equal(targetBlocked, false);
  assert.equal(targetBlockedAt, null);
  assert.equal((await actions.setUserBlocked('head-1', true)).success, false);
});

test('zwykły admin nie może blokować kont', async () => {
  authEmail = 'admin@example.test';
  storedRole = 'admin';
  assert.equal((await actions.setUserBlocked('user-1', true)).success, false);
  assert.equal(targetBlocked, false);
});

test('sprzedaż całej rezerwacji sprzedaje wszystkie książki i kończy rezerwację', async () => {
  const result = await actions.sellEntireReservation('reservation-1', 'CASH');
  assert.equal(result.success, true);
  assert.deepEqual(soldBookIds, ['book-1', 'book-2']);
  assert.equal(completedStatus, 'COMPLETED');
  assert.deepEqual(reservationItemsWhere, { book: { status: 'RESERVED' } });
});

test('błąd jednej książki wycofuje całą sprzedaż paczki', async () => {
  failSaleBookId = 'book-2';
  const result = await actions.sellEntireReservation('reservation-1', 'BLIK');
  assert.equal(result.success, false);
  assert.equal(transactionRolledBack, true);
  assert.deepEqual(soldBookIds, []);
  assert.equal(completedStatus, null);
});

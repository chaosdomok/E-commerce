import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, mock, test } from 'node:test';

type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  sellerId: string | null;
  status: string;
  reservedByUserId: string | null;
  courseCode: string | null;
};

type ReservationItem = { bookId: string; book: { title: string } };
type ReservationRecord = {
  id: string;
  code: string;
  userId: string;
  status: string;
  reservedUntil: Date;
  items: ReservationItem[];
  user: { email: string | null; fullName: string | null };
};

const makeBook = (index = 1): Book => ({
  id: `book-${index}`,
  title: `Podręcznik ${index}`,
  author: 'Autor',
  price: 20 + index,
  sellerId: `seller-${index}`,
  status: 'AVAILABLE',
  reservedByUserId: null,
  courseCode: `Przedmiot ${index}`,
});

let selectedBooks: Book[] = [makeBook()];
let activeReservationBooks: Array<{ courseCode: string | null }> = [];
let additionalDayValue: string | null = null;
let authenticatedUserId: string | null = 'buyer-1';
let codeCollisionsRemaining = 0;
let codeLookups = 0;
let reservationCreateArgs: {
  code: string;
  userId: string;
  reservedUntil: Date;
  items: Array<{ bookId: string }>;
} | null = null;
let bookReservationUpdates: Array<{
  bookId: string;
  reservedUntil: Date;
  hasReservationCode: boolean;
}> = [];
let failedBookId: string | null = null;
let transactionRolledBack = false;
let transactionOptions: { isolationLevel?: string } | undefined;
let confirmationCode: string | null = null;
let confirmationDeadline: string | null = null;
let cancelReservation: ReservationRecord | null = null;
let overdueReservations: ReservationRecord[] = [];
let reservationStatusUpdates: Array<{ id: string; status: string }> = [];
let releasedBookIds: string[] = [];
let notificationEvents: string[] = [];

const transactionClient = {
  book: {
    findMany: async () => selectedBooks,
    updateMany: async (args: {
      where: { id?: string | { in: string[] } };
      data: Record<string, unknown>;
    }) => {
      if (args.data.status === 'RESERVED') {
        const bookId = args.where.id as string;
        if (bookId === failedBookId) return { count: 0 };
        bookReservationUpdates.push({
          bookId,
          reservedUntil: args.data.reservedUntil as Date,
          hasReservationCode: 'reservationCode' in args.data,
        });
        return { count: 1 };
      }
      const ids =
        typeof args.where.id === 'object' && args.where.id
          ? args.where.id.in
          : [];
      releasedBookIds.push(...ids);
      return { count: ids.length };
    },
  },
  reservation: {
    findMany: async () => [
      {
        items: activeReservationBooks.map((book) => ({ book })),
      },
    ],
    findUnique: async () => {
      codeLookups += 1;
      if (codeCollisionsRemaining > 0) {
        codeCollisionsRemaining -= 1;
        return { id: 'existing-reservation' };
      }
      return null;
    },
    create: async (args: {
      data: {
        code: string;
        userId: string;
        reservedUntil: Date;
        items: { create: Array<{ bookId: string }> };
      };
    }) => {
      reservationCreateArgs = {
        code: args.data.code,
        userId: args.data.userId,
        reservedUntil: args.data.reservedUntil,
        items: args.data.items.create,
      };
      return { id: 'reservation-1', code: args.data.code };
    },
    findFirst: async (args: {
      where: { id: string; userId: string; status: string };
    }) =>
      cancelReservation &&
      args.where.id === cancelReservation.id &&
      args.where.userId === cancelReservation.userId &&
      args.where.status === 'ACTIVE'
        ? cancelReservation
        : null,
    updateMany: async (args: {
      where: { id: string; status: string };
      data: { status: string };
    }) => {
      if (args.data.status === 'EXPIRED') {
        const reservation = overdueReservations.find(
          (item) => item.id === args.where.id && item.status === 'ACTIVE',
        );
        if (!reservation) return { count: 0 };
        reservation.status = 'EXPIRED';
      }
      reservationStatusUpdates.push({
        id: args.where.id,
        status: args.data.status,
      });
      return { count: 1 };
    },
  },
  systemSetting: {
    findUnique: async () =>
      additionalDayValue === null ? null : { value: additionalDayValue },
  },
  profile: {
    findUnique: async () => ({
      email: 'buyer@example.test',
      fullName: 'Kupujący',
    }),
    update: async () => ({
      email: 'buyer@example.test',
      fullName: 'Kupujący',
      id: authenticatedUserId, email_confirmed_at: '2026-01-01',
    }),
  },
};

const prismaMock = {
  profile: {
    findUnique: async () => ({ isBlocked: false }),
  },
  reservation: {
    findMany: async () => overdueReservations,
  },
  $transaction: async (
    callback: (client: typeof transactionClient) => Promise<unknown>,
    options: { isolationLevel?: string },
  ) => {
    transactionOptions = options;
    const reservationSnapshot = reservationCreateArgs;
    const updatesSnapshot = [...bookReservationUpdates];
    const statusSnapshot = [...reservationStatusUpdates];
    const releasedSnapshot = [...releasedBookIds];
    try {
      return await callback(transactionClient);
    } catch (error) {
      transactionRolledBack = true;
      reservationCreateArgs = reservationSnapshot;
      bookReservationUpdates = updatesSnapshot;
      reservationStatusUpdates = statusSnapshot;
      releasedBookIds = releasedSnapshot;
      throw error;
    }
  },
};

const url = (path: string) => new URL(path, import.meta.url).href;

before(async () => {
  class TestBlockedAccountError extends Error {}
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async () => undefined,
      BLOCKED_ACCOUNT_MESSAGE: 'Konto zablokowane.',
      BlockedAccountError: TestBlockedAccountError,
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
            data: {
              user: authenticatedUserId ? { id: authenticatedUserId, email_confirmed_at: '2026-01-01' } : null,
            },
            error: authenticatedUserId ? null : { message: 'brak sesji' },
          }),
        },
      }),
    },
  });
  mock.module(url('../src/lib/audit.ts'), {
    namedExports: { logAuditEvent: async () => null },
  });
  mock.module(url('../src/lib/system-notifications.ts'), {
    namedExports: {
      createNotification: async ({ eventKey }: { eventKey: string }) => {
        notificationEvents.push(eventKey);
        return { success: true };
      },
    },
  });
  mock.module(url('../src/lib/email.ts'), {
    namedExports: {
      sendReservationConfirmedEmail: async ({
        reservationCode,
        reservedUntil,
      }: {
        reservationCode: string;
        reservedUntil: string;
      }) => {
        confirmationCode = reservationCode;
        confirmationDeadline = reservedUntil;
        return { success: true };
      },
      sendReservationExpiredEmail: async () => ({ success: true }),
    },
  });
  mock.module('next/navigation', {
    namedExports: {
      redirect: () => assert.fail('nie oczekiwano przekierowania'),
    },
  });
  mock.module('next/cache', {
    namedExports: { revalidatePath: () => undefined },
  });
});

let actions: typeof import('../src/actions/reservations');

before(async () => {
  actions = await import('../src/actions/reservations');
});

beforeEach(() => {
  selectedBooks = [makeBook()];
  activeReservationBooks = [];
  additionalDayValue = null;
  authenticatedUserId = 'buyer-1';
  codeCollisionsRemaining = 0;
  codeLookups = 0;
  reservationCreateArgs = null;
  bookReservationUpdates = [];
  failedBookId = null;
  transactionRolledBack = false;
  transactionOptions = undefined;
  confirmationCode = null;
  confirmationDeadline = null;
  cancelReservation = null;
  overdueReservations = [];
  reservationStatusUpdates = [];
  releasedBookIds = [];
  notificationEvents = [];
  mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-09-16T20:00:00+02:00'),
  });
});

afterEach(() => mock.timers.reset());

test('jedna książka tworzy jedną Reservation i jeden item', async () => {
  const result = await actions.reserveBooks(['book-1']);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.reservation.books.length, 1);
  assert.equal(reservationCreateArgs?.items.length, 1);
  assert.equal(result.reservation.reservationCode, reservationCreateArgs?.code);
  assert.equal(confirmationCode, reservationCreateArgs?.code);
  assert.equal(transactionOptions?.isolationLevel, 'Serializable');
});

test('dziesięć książek tworzy jedną Reservation z dziesięcioma items', async () => {
  selectedBooks = Array.from({ length: 10 }, (_, index) => makeBook(index + 1));
  const result = await actions.reserveBooks(selectedBooks.map((book) => book.id));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.reservation.books.length, 10);
  assert.equal(reservationCreateArgs?.items.length, 10);
  assert.equal(bookReservationUpdates.length, 10);
});

test('cały koszyk ma jeden kod na Reservation i wspólny reservedUntil', async () => {
  selectedBooks = [makeBook(1), makeBook(2), makeBook(3)];
  const result = await actions.reserveBooks(selectedBooks.map((book) => book.id));
  assert.equal(result.success, true);
  if (!result.success || !reservationCreateArgs) return;
  assert.equal(result.reservation.reservationCode, reservationCreateArgs.code);
  assert.equal(confirmationDeadline, result.reservedUntil);
  assert(
    bookReservationUpdates.every(
      (update) => update.reservedUntil.toISOString() === result.reservedUntil,
    ),
  );
  assert(bookReservationUpdates.every((update) => !update.hasReservationCode));
});

test('błąd jednej książki wycofuje Reservation i wszystkie zmiany książek', async () => {
  selectedBooks = [makeBook(1), makeBook(2), makeBook(3)];
  failedBookId = 'book-2';
  const result = await actions.reserveBooks(selectedBooks.map((book) => book.id));
  assert.equal(result.success, false);
  assert.equal(transactionRolledBack, true);
  assert.equal(reservationCreateArgs, null);
  assert.deepEqual(bookReservationUpdates, []);
});

test('kolizja unikalnego kodu Reservation powoduje wygenerowanie kolejnego', async () => {
  codeCollisionsRemaining = 1;
  const result = await actions.reserveBooks(['book-1']);
  assert.equal(result.success, true);
  assert.equal(codeLookups, 2);
  assert.match(reservationCreateArgs?.code ?? '', /^REZ-[A-Z2-9]{6}$/);
});

test('własna książka blokuje całą rezerwację', async () => {
  selectedBooks = [makeBook(1), { ...makeBook(2), sellerId: 'buyer-1' }];
  assert.deepEqual(await actions.reserveBooks(['book-1', 'book-2']), {
    success: false,
    error: 'Nie możesz zarezerwować własnej książki.',
  });
  assert.equal(reservationCreateArgs, null);
});

test('limit 15 aktywnych książek nadal jest egzekwowany', async () => {
  activeReservationBooks = Array.from({ length: 15 }, (_, index) => ({
    courseCode: `Aktywny ${index}`,
  }));
  const result = await actions.reserveBooks(['book-1']);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error, /maksymalnie 15/);
});

test('limit jednej aktywnej książki na przedmiot nadal działa', async () => {
  activeReservationBooks = [{ courseCode: ' przedmiot 1 ' }];
  const result = await actions.reserveBooks(['book-1']);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error, /danego przedmiotu/);
});

test('self-cancel zwalnia atomowo wszystkie książki z własnej paczki', async () => {
  cancelReservation = {
    id: 'reservation-1',
    code: 'REZ-GMHVVV',
    userId: 'buyer-1',
    status: 'ACTIVE',
    reservedUntil: new Date('2026-09-17T10:25:00.000Z'),
    items: [
      { bookId: 'book-1', book: { title: 'Biologia' } },
      { bookId: 'book-2', book: { title: 'Matematyka' } },
    ],
    user: { email: 'buyer@example.test', fullName: 'Kupujący' },
  };

  assert.deepEqual(await actions.cancelOwnReservation('reservation-1'), {
    success: true,
    message: 'Rezerwacja została anulowana.',
  });
  assert.deepEqual(reservationStatusUpdates, [
    { id: 'reservation-1', status: 'CANCELLED' },
  ]);
  assert.deepEqual(releasedBookIds, ['book-1', 'book-2']);
});

test('self-cancel nie pozwala anulować cudzej paczki', async () => {
  cancelReservation = {
    id: 'reservation-1',
    code: 'REZ-GMHVVV',
    userId: 'owner-2',
    status: 'ACTIVE',
    reservedUntil: new Date('2026-09-17T10:25:00.000Z'),
    items: [],
    user: { email: null, fullName: null },
  };
  const result = await actions.cancelOwnReservation('reservation-1');
  assert.equal(result.success, false);
  assert.deepEqual(releasedBookIds, []);
});

test('expiry oznacza paczkę EXPIRED i zwalnia wszystkie RESERVED książki', async () => {
  overdueReservations = [
    {
      id: 'reservation-expired',
      code: 'REZ-OLD123',
      userId: 'buyer-1',
      status: 'ACTIVE',
      reservedUntil: new Date('2026-09-16T10:25:00.000Z'),
      items: [
        { bookId: 'book-1', book: { title: 'Biologia' } },
        { bookId: 'book-2', book: { title: 'Matematyka' } },
      ],
      user: { email: 'buyer@example.test', fullName: 'Kupujący' },
    },
  ];

  assert.deepEqual(await actions.expireOverdueReservations(), {
    expiredCount: 1,
  });
  assert.deepEqual(reservationStatusUpdates, [
    { id: 'reservation-expired', status: 'EXPIRED' },
  ]);
  assert.deepEqual(releasedBookIds, ['book-1', 'book-2']);
  assert.deepEqual(notificationEvents, ['reservation-expired:reservation-expired']);

  assert.deepEqual(await actions.expireOverdueReservations(), {
    expiredCount: 0,
  });
  assert.deepEqual(releasedBookIds, ['book-1', 'book-2']);
  assert.deepEqual(notificationEvents, ['reservation-expired:reservation-expired']);
});

test('wynik dla panelu admina zachowuje wszystkie items pod jednym kodem', async () => {
  selectedBooks = [makeBook(1), makeBook(2), makeBook(3)];
  const result = await actions.reserveBooks(selectedBooks.map((book) => book.id));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.reservation.reservationCode, reservationCreateArgs?.code);
  assert.deepEqual(
    result.reservation.books.map((book) => book.bookId),
    selectedBooks.map((book) => book.id),
  );
});

import assert from 'node:assert/strict';
import { before, beforeEach, mock, test } from 'node:test';

let authenticated = true;
let ensureProfileCalls = 0;
let createCalls = 0;
let createdData: Record<string, unknown> | null = null;

let failEmail = false;
let pendingBooksCountMock = 0;

const prismaMock = {
  systemSetting: {
    findUnique: async () => null,
  },
  profile: {
    findUnique: async () => ({
      email: 'user@example.test',
      fullName: 'Zwykły Użytkownik',
    }),
    update: async () => ({ id: 'user-1', email_confirmed_at: '2026-01-01' }),
  },
  book: {
    count: async () => pendingBooksCountMock,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      if (data.title === 'Book 4 Error') {
        throw new Error('Database error during insert');
      }
      createCalls += 1;
      createdData = data;
      return { id: `book-${createCalls}`, title: data.title, price: data.price, basePrice: data.basePrice };
    },
  },
  $transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
    // Basic mock of a transaction: if any create throws, it fails the transaction
    return cb(prismaMock);
  }
};

const supabaseMock = {
  auth: {
    getUser: async () => ({
      data: { user: authenticated ? { id: 'user-1', email_confirmed_at: '2026-01-01' } : null },
    }),
  },
  storage: {
    from: () => ({
      list: async () => ({ data: [], error: null }),
    }),
  },
};

const url = (path: string) => new URL(path, import.meta.url).href;

let getPriceMarkupsCalls = 0;
let singleEmailCalls = 0;
let batchEmailCalls = 0;
let logAuditEventCalls = 0;
let createNotificationCalls = 0;

before(async () => {
  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: { prisma: prismaMock },
  });
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async () => undefined,
      BLOCKED_ACCOUNT_MESSAGE: 'Konto zablokowane.',
      BlockedAccountError: class extends Error {},
    },
  });
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: { createClient: async () => supabaseMock },
  });
  mock.module(url('../src/actions/pricing.ts'), {
    namedExports: {
      getPriceMarkups: async () => {
        getPriceMarkupsCalls += 1;
        return [{ minPrice: 1, maxPrice: null, markup: 5 }];
      },
    },
  });
  mock.module(url('../src/lib/profile.ts'), {
    namedExports: {
      ensureProfile: async () => {
        ensureProfileCalls += 1;
      },
    },
  });
  mock.module(url('../src/lib/audit.ts'), {
    namedExports: { logAuditEvent: async () => { logAuditEventCalls += 1; return null; } },
  });
  mock.module(url('../src/lib/system-notifications.ts'), {
    namedExports: { createNotification: async () => { createNotificationCalls += 1; return { success: true }; } },
  });
  mock.module(url('../src/lib/email.ts'), {
    namedExports: {
      sendBookSubmittedEmail: async () => {
        singleEmailCalls += 1;
        return { success: !failEmail, error: failEmail ? 'Email failed' : undefined };
      },
      sendBooksSubmittedBatchEmail: async () => {
        batchEmailCalls += 1;
        return { success: !failEmail, error: failEmail ? 'Email failed' : undefined };
      },
    },
  });
  mock.module('next/cache', {
    namedExports: { revalidatePath: () => undefined },
  });
});

let actions: typeof import('../src/actions/submit-books');

before(async () => {
  actions = await import('../src/actions/submit-books');
});

beforeEach(() => {
  authenticated = true;
  ensureProfileCalls = 0;
  createCalls = 0;
  createdData = null;
  getPriceMarkupsCalls = 0;
  singleEmailCalls = 0;
  batchEmailCalls = 0;
  logAuditEventCalls = 0;
  createNotificationCalls = 0;
  failEmail = false;
  pendingBooksCountMock = 0;
});

test('zalogowany zwykły użytkownik może wysłać książkę do akceptacji (19 + 1 -> PASS)', async () => {
  pendingBooksCountMock = 19;
  const result = await actions.submitBooksBatch([
    {
      title: 'Podręcznik',
      author: 'Autor',
      condition: 'DOBRY',
      courseCode: 'Matematyka',
      price: 25,
    },
  ]);

  assert.deepEqual(result, { success: true, count: 1 });
});

test('limit odrzuca zgłoszenie przekraczające 20 pending (19 + 2 -> FAIL)', async () => {
  pendingBooksCountMock = 19;
  const result = await actions.submitBooksBatch([
    { title: 'Książka 1', author: 'Autor', condition: 'DOBRY', price: 25 },
    { title: 'Książka 2', author: 'Autor', condition: 'DOBRY', price: 25 },
  ]);

  assert.deepEqual(result, {
    error: 'Możesz mieć maksymalnie 20 książek oczekujących na akceptację. Obecnie masz 19, a próbujesz dodać 2.',
  });
  assert.equal(createCalls, 0);
});

test('batch 5 książek - błąd zapisu czwartej książki przerywa transakcję', async () => {
  const result = await actions.submitBooksBatch([
    { title: 'Book 1', author: 'Autor', condition: 'DOBRY', price: 10 },
    { title: 'Book 2', author: 'Autor', condition: 'DOBRY', price: 20 },
    { title: 'Book 3', author: 'Autor', condition: 'DOBRY', price: 30 },
    { title: 'Book 4 Error', author: 'Autor', condition: 'DOBRY', price: 40 },
    { title: 'Book 5', author: 'Autor', condition: 'DOBRY', price: 50 },
  ]);

  assert.deepEqual(result, { error: 'Wystąpił błąd podczas zapisywania książek.' });
  // createCalls zliczy tylko te zapytania, które przeszły (3) przed wyrzuceniem błędu dla Book 4
  assert.equal(createCalls, 3); 
  
  // Z powodu failu transakcji w Prisma (symulowanego w try-catch transakcji), notyfikacje, logi i maile się nie wywołają
  assert.equal(logAuditEventCalls, 0, 'Audit logs na zero');
  assert.equal(createNotificationCalls, 0, 'Notyfikacje na zero');
  assert.equal(batchEmailCalls, 0, 'Email się nie wysłał');
});

test('email failure nie cofa poprawnie zapisanych w bazie książek', async () => {
  failEmail = true;
  const result = await actions.submitBooksBatch([
    { title: 'Book A', author: 'Autor', condition: 'DOBRY', price: 10 },
    { title: 'Book B', author: 'Autor', condition: 'DOBRY', price: 20 },
  ]);

  assert.deepEqual(result, { success: true, count: 2 });
  assert.equal(createCalls, 2);
  assert.equal(logAuditEventCalls, 2);
  assert.equal(batchEmailCalls, 1);
});

test('zalogowany zwykły użytkownik może wysłać książkę do akceptacji', async () => {
  const result = await actions.submitBooksBatch([
    {
      title: 'Podręcznik',
      author: 'Autor',
      condition: 'DOBRY',
      courseCode: 'Matematyka',
      price: 25,
    },
  ]);

  assert.deepEqual(result, { success: true, count: 1 });
  assert.equal(ensureProfileCalls, 1);
  assert.equal(createCalls, 1);
  assert.equal(getPriceMarkupsCalls, 1);
  assert.equal(singleEmailCalls, 1);
  assert.equal(batchEmailCalls, 0);
  assert.equal(createdData?.sellerId, 'user-1');
  assert.equal(createdData?.status, 'PENDING_APPROVAL');
});

test('zgłoszenie wielu książek wywołuje jeden e-mail podsumowujący i jeden lookup cennika', async () => {
  const result = await actions.submitBooksBatch([
    { title: 'Podręcznik 1', author: 'Autor 1', condition: 'DOBRY', price: 25 },
    { title: 'Podręcznik 2', author: 'Autor 2', condition: 'ZŁY', price: 15 },
    { title: 'Podręcznik 3', author: 'Autor 3', condition: 'NOWY', price: 55 },
  ]);

  assert.deepEqual(result, { success: true, count: 3 });
  assert.equal(createCalls, 3);
  assert.equal(getPriceMarkupsCalls, 1, 'Cennik pobrany tylko raz przed pętlą');
  assert.equal(singleEmailCalls, 0, 'Nie wysyłano pojedynczych e-maili');
  assert.equal(batchEmailCalls, 1, 'Wysłano tylko jeden e-mail podsumowujący');
});

test('akcja serwerowa odrzuca cenę z groszami bez zapisu książki', async () => {
  const result = await actions.submitBooksBatch([
    {
      title: 'Podręcznik',
      author: 'Autor',
      condition: 'DOBRY',
      courseCode: 'Matematyka',
      price: 20.5,
    },
  ]);

  assert.deepEqual(result, {
    error: 'Cena musi być podana w pełnych złotych, bez groszy.',
  });
  assert.equal(createCalls, 0);
});

test('akcja serwerowa odrzuca NaN bez zapisu książki', async () => {
  const result = await actions.submitBooksBatch([
    {
      title: 'Podręcznik',
      author: 'Autor',
      condition: 'DOBRY',
      courseCode: 'Matematyka',
      price: Number.NaN,
    },
  ]);

  assert.deepEqual(result, { error: 'Cena musi być prawidłową liczbą.' });
  assert.equal(createCalls, 0);
});

test('niezalogowany użytkownik nie może dodać książki', async () => {
  authenticated = false;
  assert.deepEqual(await actions.submitBooksBatch([]), {
    error: 'Musisz być zalogowany, aby dodać podręcznik.',
  });
  assert.equal(ensureProfileCalls, 0);
  assert.equal(createCalls, 0);
});

test('nie zapisuje książki z zewnętrznym adresem okładki', async () => {
  const result = await actions.submitBooksBatch([
    {
      title: 'Podręcznik',
      author: 'Autor',
      condition: 'DOBRY',
      courseCode: 'Matematyka',
      price: 25,
      coverUrl: 'https://example.test/not-uploaded.jpg',
    },
  ]);

  assert.deepEqual(result, {
    error:
      'Zdjęcie okładki nie istnieje albo nie należy do zalogowanego użytkownika.',
  });
  assert.equal(createCalls, 0);
});

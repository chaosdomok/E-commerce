import assert from 'node:assert/strict';
import { before, mock, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { formatAuditLogsText } from '../src/lib/audit-export';

const insertedIds = new Set<string>();
let insertCalls = 0;
const insertedUserIds: string[] = [];
let userClientInsertCalls = 0;
let failSystemInsert = false;
let accountBlocked = false;
let signOutCalls = 0;
const url = (path: string) => new URL(path, import.meta.url).href;

class TestBlockedAccountError extends Error {}

before(async () => {
  mock.module('server-only', { namedExports: {} });
  mock.module(url('../src/actions/auth.ts'), {
    namedExports: { changePassword: async () => ({ success: true }) },
  });
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async (
        _userId: string,
        signOut?: () => Promise<unknown>,
      ) => {
        if (accountBlocked) {
          await signOut?.();
          throw new TestBlockedAccountError();
        }
      },
      BLOCKED_ACCOUNT_MESSAGE:
        'Twoje konto zostało zablokowane. Skontaktuj się z obsługą Targów Książek.',
      BlockedAccountError: TestBlockedAccountError,
    },
  });
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'user-1' } } }),
          signOut: async () => {
            signOutCalls += 1;
          },
        },
        from: () => ({
          insert: async () => {
            userClientInsertCalls += 1;
            return { error: { code: '42501' } };
          },
        }),
      }),
    },
  });
  mock.module(url('../src/lib/supabase/admin.ts'), {
    namedExports: {
      createSupabaseAdminClient: () => ({
        from: () => ({
          insert: async ({ id, user_id }: { id: string; user_id: string }) => {
            insertCalls += 1;
            insertedUserIds.push(user_id);
            if (failSystemInsert) return { error: { code: '42501' } };
            if (insertedIds.has(id)) return { error: { code: '23505' } };
            insertedIds.add(id);
            return { error: null };
          },
        }),
      }),
    },
  });
});

let actions: typeof import('../src/actions/notifications');
let systemNotifications: typeof import('../src/lib/system-notifications');
before(async () => {
  actions = await import('../src/actions/notifications');
  systemNotifications = await import('../src/lib/system-notifications');
});

test('ten sam event tworzy jedno trwałe powiadomienie bez kolumny type', async () => {
  const payload = {
    userId: 'user-1',
    title: 'Rezerwacja utworzona',
    message: 'Gotowe',
    type: 'success' as const,
    eventKey: 'reservation-created:reservation-1',
  };
  assert.equal((await systemNotifications.createNotification(payload)).success, true);
  assert.equal((await systemNotifications.createNotification(payload)).success, true);
  assert.equal(insertCalls, 2);
  assert.equal(insertedIds.size, 1);
  assert.deepEqual(insertedUserIds, ['user-1', 'user-1']);
  assert.equal(userClientInsertCalls, 0);

  const source = await readFile(
    new URL('../src/lib/system-notifications.ts', import.meta.url),
    'utf8',
  );
  const insertBlock = source.match(/\.insert\(\{([\s\S]*?)\}\);/)?.[1] ?? '';
  assert.doesNotMatch(insertBlock, /\btype\s*:/);
});

test('błąd systemowego notification jest best-effort i nie rzuca wyjątku', async () => {
  failSystemInsert = true;
  const result = await systemNotifications.createNotification({
    userId: 'user-2',
    title: 'Test',
    message: 'Test błędu',
    eventKey: 'best-effort:test',
  });
  failSystemInsert = false;

  assert.deepEqual(result, { error: 'Failed to create notification' });
  assert.equal(userClientInsertCalls, 0);
});

test('zablokowane konto otrzymuje kontrolowany wynik bez nieobsłużonego wyjątku', async () => {
  signOutCalls = 0;
  accountBlocked = true;
  const result = await actions.getUserNotifications();
  accountBlocked = false;

  assert.equal('blocked' in result && result.blocked, true);
  assert.match(result.error ?? '', /konto zostało zablokowane/i);
  assert.equal(signOutCalls, 1);
});

test('każdy wymagany event ma trwały, deduplikowany klucz', async () => {
  const sources = await Promise.all(
    ['admin.ts', 'auth.ts', 'reservations.ts', 'submit-books.ts'].map((name) =>
      readFile(new URL(`../src/actions/${name}`, import.meta.url), 'utf8'),
    ),
  );
  const source = sources.join('\n');
  for (const event of [
    'book-approved:',
    'book-rejected:',
    'book-purchased:',
    'book-sold:',
    'reservation-created:',
    'reservation-ready:',
    'reservation-admin-cancelled:',
    'reservation-user-cancelled:',
    'password-changed:',
    'book-submitted:',
  ]) {
    assert.match(source, new RegExp(event));
  }
});

test('dropdown rozpoczyna tylko jedno pobranie na mount', async () => {
  const source = await readFile(
    new URL('../src/components/site/notification-dropdown.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /initialFetchStarted = useRef\(false\)/);
  assert.match(source, /if \(!initialFetchStarted\.current\)/);
  assert.match(source, /initialFetchStarted\.current = true/);
  assert.match(source, /\/login\?error=account_blocked/);
});

test('eksport logów redaguje sekrety i UI ogranicza go do head_admin', async () => {
  const output = formatAuditLogsText([
    {
      action: 'TEST',
      userName: 'Jan',
      createdAt: '2026-09-13T10:30:10.000Z',
      details: { bookId: 'book-1', token: 'secret-value', password: 'hidden' },
    },
  ]);
  assert.match(output, /USER: Jan/);
  assert.match(output, /ACTION: TEST/);
  assert.match(output, /book-1/);
  assert.doesNotMatch(output, /secret-value|hidden/);

  const dashboard = await readFile(
    new URL('../src/components/site/admin-dashboard.tsx', import.meta.url),
    'utf8',
  );
  assert.match(dashboard, /isHeadAdmin && \([\s\S]*?Pobierz logi/);
});

test('endpoint expiry wymaga sekretu schedulera', async () => {
  const source = await readFile(
    new URL('../src/app/api/cron/expire-reservations/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /authorization !== `Bearer \$\{cronSecret\}`/);
  assert.match(source, /status: 401/);
});

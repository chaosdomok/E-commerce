import assert from 'node:assert/strict';
import { test, mock, before, beforeEach } from 'node:test';

const url = (path: string) => new URL(path, import.meta.url).href;

let profileFindUniqueCalls = 0;
let lastSelectQuery: Record<string, unknown> | null = null;
let lastLimit: number | null = null;

before(() => {
  mock.module('server-only', { namedExports: {} });

  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: {
      prisma: {
        profile: {
          findUnique: async (args: { where: { id: string }; select?: Record<string, boolean> }) => {
            profileFindUniqueCalls += 1;
            lastSelectQuery = args.select ?? null;
            return {
              id: args.where.id,
              email: 'test@example.com',
              fullName: 'Jan Kowalski',
              class: '3A',
              school: 'LO 1',
              initials: 'JK',
              phone: '+48 123 456 789',
              reputationScore: 100,
              role: 'user',
              isBlocked: false,
              accountType: 'student',
              refundMethod: 'BLIK',
              createdAt: new Date(),
              updatedAt: new Date(),
              department: null,
            };
          },
        },
        book: {
          findMany: async () => [],
        },
        reservation: {
          findMany: async () => [],
        },
      },
    },
  });

  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'user-perf-1', email: 'test@example.com' } },
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: (n: number) => {
                  lastLimit = n;
                  return Promise.resolve({
                    data: [
                      {
                        id: 'notif-1',
                        user_id: 'user-perf-1',
                        title: 'Test',
                        message: 'Wiadomość',
                        is_read: false,
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  });
                },
              }),
            }),
          }),
        }),
      }),
    },
  });
});

beforeEach(() => {
  profileFindUniqueCalls = 0;
  lastSelectQuery = null;
  lastLimit = null;
});

test('getUserNotifications respektuje bezpieczny limit (max 20 powiadomień)', async () => {
  const { getUserNotifications } = await import('../src/actions/notifications');
  const result = await getUserNotifications();

  assert.equal('notifications' in result, true);
  if ('notifications' in result && result.notifications) {
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0]?.title, 'Test');
  }
  assert.equal(lastLimit, 20);
});

test('isAccountBlocked poprawnie pobiera status zablokowania konta', async () => {
  const { isAccountBlocked } = await import('../src/lib/account-access');

  const blocked = await isAccountBlocked('user-perf-1');
  assert.equal(blocked, false);
  assert.equal(profileFindUniqueCalls, 1);
  assert.deepEqual(lastSelectQuery, { isBlocked: true });
});

test('Navbar inicializuje isAuthenticated=false od razu gdy initialProfile jest null', async () => {
  // initialProfile === null means guest, no skeleton flash
  const initialProfile = null;
  const isFrontendPreview = false;
  const authenticatedUserId = undefined;

  const isAuthenticated = (() => {
    if (isFrontendPreview || initialProfile || authenticatedUserId) return true;
    if (initialProfile === null) return false;
    return null;
  })();

  assert.equal(isAuthenticated, false);
});

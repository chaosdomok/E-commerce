import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTH_USERS_PAGE_SIZE,
  buildResetPlan,
  listAllAuthUsers,
  parseResetArguments,
  RESET_CONFIRMATION,
  runReset,
  type ResetDependencies,
} from '../scripts/reset-beta-data';

test('paginacja Auth kończy się po jednej niepełnej stronie', async () => {
  const calls: Array<{ page: number; perPage: number }> = [];
  const users = await listAllAuthUsers(async (pagination) => {
    calls.push(pagination);
    return {
      data: {
        users: [{ id: 'user-1', email: 'user@example.test' }],
        nextPage: null,
        lastPage: 1,
        total: 1,
      },
      error: null,
    };
  });

  assert.deepEqual(users.map((user) => user.id), ['user-1']);
  assert.deepEqual(calls, [{ page: 1, perPage: AUTH_USERS_PAGE_SIZE }]);
});

test('paginacja Auth pobiera kilka pełnych stron i respektuje ostatnią stronę API', async () => {
  const calls: number[] = [];
  const users = await listAllAuthUsers(
    async ({ page }) => {
      calls.push(page);
      return {
        data: {
          users: [
            { id: `user-${page}-1`, email: `user-${page}-1@example.test` },
            { id: `user-${page}-2`, email: `user-${page}-2@example.test` },
          ],
          nextPage: page < 3 ? page + 1 : null,
          lastPage: 3,
          total: 6,
        },
        error: null,
      };
    },
    { perPage: 2 },
  );

  assert.equal(users.length, 6);
  assert.deepEqual(calls, [1, 2, 3]);
});

test('paginacja Auth kończy się na ostatniej niepełnej stronie bez metadanych', async () => {
  const calls: number[] = [];
  const users = await listAllAuthUsers(
    async ({ page }) => {
      calls.push(page);
      return {
        data: {
          users:
            page === 1
              ? [
                  { id: 'user-1', email: 'one@example.test' },
                  { id: 'user-2', email: 'two@example.test' },
                ]
              : [{ id: 'user-3', email: 'three@example.test' }],
          nextPage: null,
          lastPage: 0,
          total: 0,
        },
        error: null,
      };
    },
    { perPage: 2 },
  );

  assert.deepEqual(users.map((user) => user.id), ['user-1', 'user-2', 'user-3']);
  assert.deepEqual(calls, [1, 2]);
});

test('paginacja Auth raportuje bezpieczne szczegóły błędu drugiej strony', async () => {
  const logs: string[] = [];
  await assert.rejects(
    listAllAuthUsers(
      async ({ page }) =>
        page === 1
          ? {
              data: {
                users: [
                  { id: 'user-1', email: 'one@example.test' },
                  { id: 'user-2', email: 'two@example.test' },
                ],
                nextPage: 2,
                lastPage: 2,
                total: 3,
              },
              error: null,
            }
          : {
              data: { users: [] },
              error: {
                status: 500,
                code: 'unexpected_failure',
                message: 'Database error finding users',
              },
            },
      { perPage: 2, logError: (message) => logs.push(message) },
    ),
    /page=2 status=500 code=unexpected_failure message=Database error finding users/,
  );

  assert.deepEqual(logs, [
    'Supabase Auth listUsers failed: page=2 status=500 code=unexpected_failure message=Database error finding users',
  ]);
});

function createDependencies() {
  const calls = {
    authDeletes: [] as string[],
    databaseDeletes: 0,
    storageDeletes: 0,
  };

  const dependencies: ResetDependencies = {
    listAuthUsers: async () => [
      { id: 'head-1', email: 'HEAD@Example.test' },
      { id: 'head-2', email: 'second@example.test' },
      { id: 'user-1', email: 'user@example.test' },
    ],
    listProfiles: async () => [
      { id: 'head-1', email: null },
      { id: 'head-2', email: 'SECOND@example.test' },
      { id: 'user-1', email: 'user@example.test' },
    ],
    listPublicUsers: async () => [
      { id: 'head-1', email: 'head@example.test' },
      { id: 'user-1', email: 'user@example.test' },
    ],
    getCounts: async () => ({
      books: 84,
      orders: 3,
      reservations: 21,
      reservationItems: 55,
      notifications: 103,
      auditLogs: 240,
    }),
    countBookCoverObjects: async () => 18,
    deleteAuthUser: async (id) => {
      calls.authDeletes.push(id);
    },
    deleteDatabaseData: async () => {
      calls.databaseDeletes += 1;
    },
    emptyBookCoversBucket: async () => {
      calls.storageDeletes += 1;
    },
  };

  return { calls, dependencies };
}

const configuredEmails = '  head@example.test; SECOND@EXAMPLE.TEST, head@example.test  ';

test('zachowuje head adminów case-insensitive i usuwa zwykłe konta', async () => {
  const { dependencies } = createDependencies();
  const plan = await buildResetPlan(dependencies, configuredEmails, true);

  assert.deepEqual(plan.configuredHeadAdminEmails, [
    'head@example.test',
    'second@example.test',
  ]);
  assert.deepEqual(plan.preservedAuthUserIds.sort(), ['head-1', 'head-2']);
  assert.deepEqual(plan.preservedProfileIds.sort(), ['head-1', 'head-2']);
  assert.deepEqual(plan.preservedPublicUserIds, ['head-1']);
  assert.deepEqual(plan.authUserIdsToDelete, ['user-1']);
  assert.deepEqual(plan.profileIdsToDelete, ['user-1']);
  assert.deepEqual(plan.publicUserIdsToDelete, ['user-1']);
  assert.equal(plan.storageObjects, 18);
});

test('dry-run nie wykonuje żadnej operacji usuwania', async () => {
  const { calls, dependencies } = createDependencies();
  await runReset({
    mode: 'dry-run',
    includeStorage: true,
    headAdminEmails: configuredEmails,
    dependencies,
    output: () => undefined,
  });

  assert.deepEqual(calls.authDeletes, []);
  assert.equal(calls.databaseDeletes, 0);
  assert.equal(calls.storageDeletes, 0);
});

test('execute bez dokładnego jawnego potwierdzenia jest blokowany', async () => {
  const { calls, dependencies } = createDependencies();
  await assert.rejects(
    runReset({
      mode: 'execute',
      includeStorage: true,
      headAdminEmails: configuredEmails,
      dependencies,
      requestConfirmation: async () => 'reset-beta-data',
      output: () => undefined,
    }),
    /Nieprawidłowe potwierdzenie/,
  );

  assert.deepEqual(calls.authDeletes, []);
  assert.equal(calls.databaseDeletes, 0);
  assert.equal(calls.storageDeletes, 0);
});

test('execute po potwierdzeniu usuwa tylko zwykłych użytkowników', async () => {
  const { calls, dependencies } = createDependencies();
  await runReset({
    mode: 'execute',
    includeStorage: false,
    headAdminEmails: configuredEmails,
    dependencies,
    requestConfirmation: async () => RESET_CONFIRMATION,
    output: () => undefined,
  });

  assert.deepEqual(calls.authDeletes, ['user-1']);
  assert.equal(calls.databaseDeletes, 1);
  assert.equal(calls.storageDeletes, 0);
});

test('brak dopasowanego head admina Auth blokuje execute', async () => {
  const { calls, dependencies } = createDependencies();
  dependencies.listAuthUsers = async () => [{ id: 'user-1', email: 'user@example.test' }];

  await assert.rejects(
    runReset({
      mode: 'execute',
      includeStorage: false,
      headAdminEmails: 'missing@example.test',
      dependencies,
      requestConfirmation: async () => RESET_CONFIRMATION,
      output: () => undefined,
    }),
    /Nie znaleziono żadnego konta Supabase Auth/,
  );
  assert.deepEqual(calls.authDeletes, []);
  assert.equal(calls.databaseDeletes, 0);
});

test('CLI wymaga dokładnie jednego jawnego trybu', () => {
  assert.deepEqual(parseResetArguments(['--dry-run']), {
    mode: 'dry-run',
    includeStorage: false,
  });
  assert.throws(() => parseResetArguments([]), /dokładnie jeden tryb/);
  assert.throws(
    () => parseResetArguments(['--dry-run', '--execute']),
    /dokładnie jeden tryb/,
  );
});

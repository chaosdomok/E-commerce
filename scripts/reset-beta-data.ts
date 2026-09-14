import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { normalizeEmail, parseEmailList } from '../src/lib/roles';

export const RESET_CONFIRMATION = 'RESET-BETA-DATA';

export type ResetMode = 'dry-run' | 'execute';

export type AccountRecord = {
  id: string;
  email: string | null | undefined;
};

export const AUTH_USERS_PAGE_SIZE = 100;

export type AuthUsersPageResult = {
  data: {
    users: AccountRecord[];
    nextPage?: number | null;
    lastPage?: number;
    total?: number;
  };
  error: {
    status?: number;
    code?: string;
    message?: string;
  } | null;
};

export type FetchAuthUsersPage = (pagination: {
  page: number;
  perPage: number;
}) => Promise<AuthUsersPageResult>;

export type ResetCounts = {
  books: number;
  orders: number;
  reservations: number;
  reservationItems: number;
  notifications: number;
  auditLogs: number;
};

export type ResetPlan = ResetCounts & {
  configuredHeadAdminEmails: string[];
  preservedHeadAdminEmails: string[];
  preservedAuthUserIds: string[];
  preservedProfileIds: string[];
  preservedPublicUserIds: string[];
  authUserIdsToDelete: string[];
  profileIdsToDelete: string[];
  publicUserIdsToDelete: string[];
  storageObjects: number | null;
};

export type DatabaseDeletionTarget = {
  profileIds: string[];
  publicUserIds: string[];
};

export type ResetDependencies = {
  listAuthUsers(): Promise<AccountRecord[]>;
  listProfiles(): Promise<AccountRecord[]>;
  listPublicUsers(): Promise<AccountRecord[]>;
  getCounts(): Promise<ResetCounts>;
  countBookCoverObjects(): Promise<number>;
  deleteAuthUser(userId: string): Promise<void>;
  deleteDatabaseData(target: DatabaseDeletionTarget): Promise<void>;
  emptyBookCoversBucket(): Promise<void>;
  dispose?(): Promise<void>;
};

export type RunResetOptions = {
  mode: ResetMode;
  includeStorage: boolean;
  headAdminEmails: string | undefined;
  dependencies: ResetDependencies;
  requestConfirmation?: () => Promise<string>;
  output?: (message: string) => void;
};

function isHeadAdminEmail(email: string | null | undefined, configured: Set<string>) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && configured.has(normalized));
}

export async function buildResetPlan(
  dependencies: ResetDependencies,
  headAdminEmails: string | undefined,
  includeStorage: boolean,
): Promise<ResetPlan> {
  const configuredHeadAdminEmails = parseEmailList(headAdminEmails);
  if (configuredHeadAdminEmails.length === 0) {
    throw new Error('HEAD_ADMIN_EMAILS nie zawiera żadnego poprawnego adresu. Reset został zablokowany.');
  }

  const configured = new Set(configuredHeadAdminEmails);
  const [authUsers, profiles, publicUsers, counts, storageObjects] = await Promise.all([
    dependencies.listAuthUsers(),
    dependencies.listProfiles(),
    dependencies.listPublicUsers(),
    dependencies.getCounts(),
    includeStorage ? dependencies.countBookCoverObjects() : Promise.resolve(null),
  ]);

  const preservedAuthUsers = authUsers.filter((user) =>
    isHeadAdminEmail(user.email, configured),
  );
  const preservedAuthUserIds = new Set(preservedAuthUsers.map((user) => user.id));

  const preservedProfiles = profiles.filter(
    (profile) =>
      preservedAuthUserIds.has(profile.id) ||
      isHeadAdminEmail(profile.email, configured),
  );
  const preservedPublicUsers = publicUsers.filter(
    (user) =>
      preservedAuthUserIds.has(user.id) ||
      isHeadAdminEmail(user.email, configured),
  );

  const discoveredEmails = new Set(
    [...preservedAuthUsers, ...preservedProfiles, ...preservedPublicUsers]
      .map((record) => normalizeEmail(record.email))
      .filter(Boolean),
  );

  return {
    ...counts,
    configuredHeadAdminEmails,
    preservedHeadAdminEmails: configuredHeadAdminEmails.filter((email) =>
      discoveredEmails.has(email),
    ),
    preservedAuthUserIds: [...preservedAuthUserIds],
    preservedProfileIds: preservedProfiles.map((profile) => profile.id),
    preservedPublicUserIds: preservedPublicUsers.map((user) => user.id),
    authUserIdsToDelete: authUsers
      .filter((user) => !preservedAuthUserIds.has(user.id))
      .map((user) => user.id),
    profileIdsToDelete: profiles
      .filter((profile) => !preservedProfiles.some((preserved) => preserved.id === profile.id))
      .map((profile) => profile.id),
    publicUserIdsToDelete: publicUsers
      .filter((user) => !preservedPublicUsers.some((preserved) => preserved.id === user.id))
      .map((user) => user.id),
    storageObjects,
  };
}

export function formatResetPlan(plan: ResetPlan, includeStorage: boolean): string[] {
  const lines = [
    `Head admin emails configured: ${plan.configuredHeadAdminEmails.length}`,
    `Head admins preserved: ${plan.preservedHeadAdminEmails.length}`,
    ...plan.preservedHeadAdminEmails.map((email) => `  - ${email}`),
    `Auth users to delete: ${plan.authUserIdsToDelete.length}`,
    `Profiles to delete: ${plan.profileIdsToDelete.length}`,
    `Public users to delete: ${plan.publicUserIdsToDelete.length}`,
    `Books to delete: ${plan.books}`,
    `Orders to delete: ${plan.orders}`,
    `Reservations to delete: ${plan.reservations}`,
    `ReservationItems to delete: ${plan.reservationItems}`,
    `Notifications to delete: ${plan.notifications}`,
    `Audit logs to delete: ${plan.auditLogs}`,
  ];

  lines.push(
    includeStorage
      ? `Book-cover objects to delete: ${plan.storageObjects ?? 0}`
      : 'Book-cover storage cleanup: disabled',
  );

  const missing = plan.configuredHeadAdminEmails.filter(
    (email) => !plan.preservedHeadAdminEmails.includes(email),
  );
  if (missing.length > 0) {
    lines.push(`Configured head admins not found: ${missing.join(', ')}`);
  }

  return lines;
}

function assertPlanIsSafe(plan: ResetPlan) {
  if (plan.preservedAuthUserIds.length === 0) {
    throw new Error(
      'Nie znaleziono żadnego konta Supabase Auth z HEAD_ADMIN_EMAILS. Tryb --execute został zablokowany.',
    );
  }

  const preserved = new Set(plan.preservedAuthUserIds);
  if (plan.authUserIdsToDelete.some((id) => preserved.has(id))) {
    throw new Error('Wewnętrzna kontrola bezpieczeństwa wykryła head admina na liście usuwania.');
  }
}

export async function runReset(options: RunResetOptions): Promise<ResetPlan> {
  const output = options.output ?? console.log;
  const plan = await buildResetPlan(
    options.dependencies,
    options.headAdminEmails,
    options.includeStorage,
  );

  for (const line of formatResetPlan(plan, options.includeStorage)) output(line);

  if (options.mode === 'dry-run') {
    output('DRY RUN: nie zmieniono żadnych danych.');
    return plan;
  }

  assertPlanIsSafe(plan);
  if (!options.requestConfirmation) {
    throw new Error('Tryb --execute wymaga interaktywnego potwierdzenia.');
  }

  const confirmation = (await options.requestConfirmation()).trim();
  if (confirmation !== RESET_CONFIRMATION) {
    throw new Error('Nieprawidłowe potwierdzenie. Reset został anulowany bez zmian.');
  }

  // Auth i PostgreSQL nie obsługują wspólnej transakcji. Najpierw odbieramy
  // dostęp kontom testowym; operacja jest idempotentna i może zostać wznowiona.
  for (const userId of plan.authUserIdsToDelete) {
    await options.dependencies.deleteAuthUser(userId);
  }

  await options.dependencies.deleteDatabaseData({
    profileIds: plan.profileIdsToDelete,
    publicUserIds: plan.publicUserIdsToDelete,
  });

  if (options.includeStorage) {
    await options.dependencies.emptyBookCoversBucket();
  }

  output('Reset danych beta zakończony. Konta head adminów zostały zachowane.');
  return plan;
}

export function parseResetArguments(args: string[]): {
  mode: ResetMode;
  includeStorage: boolean;
} {
  const known = new Set(['--dry-run', '--execute', '--include-storage']);
  const unknown = args.filter((arg) => !known.has(arg));
  if (unknown.length > 0) {
    throw new Error(`Nieznane argumenty: ${unknown.join(', ')}`);
  }

  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  if (dryRun === execute) {
    throw new Error('Podaj dokładnie jeden tryb: --dry-run albo --execute.');
  }

  return { mode: dryRun ? 'dry-run' : 'execute', includeStorage: args.includes('--include-storage') };
}

function safeAuthErrorField(value: unknown, fallback: string): string {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  return String(value).replace(/[\r\n\t]+/g, ' ').slice(0, 300) || fallback;
}

function formatAuthPageError(page: number, error: unknown): string {
  const details =
    typeof error === 'object' && error !== null
      ? (error as { status?: unknown; code?: unknown; message?: unknown })
      : {};
  const message =
    error instanceof Error ? error.message : safeAuthErrorField(details.message, 'unknown');

  return [
    `page=${page}`,
    `status=${safeAuthErrorField(details.status, 'unknown')}`,
    `code=${safeAuthErrorField(details.code, 'unknown')}`,
    `message=${safeAuthErrorField(message, 'unknown')}`,
  ].join(' ');
}

export async function listAllAuthUsers(
  fetchPage: FetchAuthUsersPage,
  options: {
    perPage?: number;
    logError?: (message: string) => void;
  } = {},
): Promise<AccountRecord[]> {
  const users: AccountRecord[] = [];
  const seenUserIds = new Set<string>();
  const perPage = options.perPage ?? AUTH_USERS_PAGE_SIZE;
  const logError = options.logError ?? console.error;

  if (!Number.isInteger(perPage) || perPage < 1 || perPage > AUTH_USERS_PAGE_SIZE) {
    throw new Error(
      `Nieprawidłowy rozmiar strony Auth: ${perPage}. Dozwolony zakres: 1-${AUTH_USERS_PAGE_SIZE}.`,
    );
  }

  for (let page = 1; page <= 10_000; page += 1) {
    let result: AuthUsersPageResult;
    try {
      result = await fetchPage({ page, perPage });
    } catch (error) {
      const details = formatAuthPageError(page, error);
      logError(`Supabase Auth listUsers failed: ${details}`);
      throw new Error(`Nie udało się pobrać użytkowników Supabase Auth: ${details}`);
    }

    if (result.error) {
      const details = formatAuthPageError(page, result.error);
      logError(`Supabase Auth listUsers failed: ${details}`);
      throw new Error(`Nie udało się pobrać użytkowników Supabase Auth: ${details}`);
    }

    const pageUsers = result.data.users;
    for (const user of pageUsers) {
      if (seenUserIds.has(user.id)) continue;
      seenUserIds.add(user.id);
      users.push(user);
    }

    if (pageUsers.length < perPage) return users;

    const lastPage = result.data.lastPage;
    if (Number.isInteger(lastPage) && (lastPage ?? 0) > 0 && page >= (lastPage ?? 0)) {
      return users;
    }

    const total = result.data.total;
    if (Number.isInteger(total) && (total ?? 0) > 0 && users.length >= (total ?? 0)) {
      return users;
    }

    // auth-js może zwrócić puste albo niespójne metadane paginacji
    // (nextPage=null, lastPage=0), mimo pełnej strony. Wtedy bezpiecznie
    // pytamy o następną stronę i kończymy po stronie niepełnej. Gdy API
    // podaje wiarygodne lastPage/total, kończymy wcześniej powyżej.
  }

  throw new Error('Przekroczono bezpieczny limit stronicowania użytkowników Auth.');
}

async function countStorageObjects(
  supabaseAdmin: ReturnType<
    typeof import('../src/lib/supabase/admin')['createSupabaseAdminClient']
  >,
  bucketName: string,
): Promise<number> {
  const bucket = supabaseAdmin.storage.from(bucketName);
  const pendingFolders = [''];
  const visited = new Set<string>();
  let objectCount = 0;

  while (pendingFolders.length > 0) {
    const folder = pendingFolders.shift() ?? '';
    if (visited.has(folder)) continue;
    visited.add(folder);

    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await bucket.list(folder, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`Nie udało się policzyć plików w book-covers: ${error.message}`);

      for (const entry of data ?? []) {
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        if (!entry.id && entry.metadata === null) pendingFolders.push(path);
        else objectCount += 1;
      }

      if (!data || data.length < pageSize) break;
    }
  }

  return objectCount;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function createRuntimeDependencies(): Promise<ResetDependencies> {
  const [{ prisma }, { createSupabaseAdminClient }, { BOOK_COVERS_BUCKET }] =
    await Promise.all([
      import('../src/lib/prisma'),
      import('../src/lib/supabase/admin'),
      import('../src/lib/book-cover-upload'),
    ]);
  const supabaseAdmin = createSupabaseAdminClient();

  return {
    listAuthUsers: () =>
      listAllAuthUsers(async ({ page, perPage }) => {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          return {
            data: { users: [] },
            error: {
              status: error.status,
              code: error.code,
              message: error.message,
            },
          };
        }

        return {
          data: {
            users: data.users.map((user) => ({ id: user.id, email: user.email })),
            nextPage: data.nextPage,
            lastPage: data.lastPage,
            total: data.total,
          },
          error: null,
        };
      }),
    listProfiles: () =>
      prisma.profile.findMany({ select: { id: true, email: true } }),
    listPublicUsers: () =>
      prisma.user.findMany({ select: { id: true, email: true } }),
    getCounts: async () => {
      const [books, orders, reservations, reservationItems, notifications, auditLogs] =
        await Promise.all([
          prisma.book.count(),
          prisma.order.count(),
          prisma.reservation.count(),
          prisma.reservationItem.count(),
          prisma.notifications.count(),
          prisma.auditLog.count(),
        ]);
      return { books, orders, reservations, reservationItems, notifications, auditLogs };
    },
    countBookCoverObjects: () => countStorageObjects(supabaseAdmin, BOOK_COVERS_BUCKET),
    deleteAuthUser: async (userId) => {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        throw new Error(`Nie udało się usunąć użytkownika Supabase Auth ${userId}: ${error.message}`);
      }
    },
    deleteDatabaseData: async ({ profileIds, publicUserIds }) => {
      await prisma.$transaction(async (tx) => {
        await tx.reservationItem.deleteMany();
        await tx.reservation.deleteMany();
        await tx.order.deleteMany();
        await tx.notifications.deleteMany();
        await tx.auditLog.deleteMany();
        await tx.book.deleteMany();

        for (const ids of chunks(profileIds, 5_000)) {
          await tx.profile.deleteMany({ where: { id: { in: ids } } });
        }
        for (const ids of chunks(publicUserIds, 5_000)) {
          await tx.user.deleteMany({ where: { id: { in: ids } } });
        }
      });
    },
    emptyBookCoversBucket: async () => {
      const { error } = await supabaseAdmin.storage.emptyBucket(BOOK_COVERS_BUCKET);
      if (error) throw new Error(`Nie udało się opróżnić book-covers: ${error.message}`);
    },
    dispose: () => prisma.$disconnect(),
  };
}

async function askForConfirmation() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Tryb --execute wymaga interaktywnego terminala.');
  }

  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return await readline.question(`Wpisz ${RESET_CONFIRMATION}, aby wykonać reset: `);
  } finally {
    readline.close();
  }
}

async function loadLocalEnvironment() {
  const { config } = await import('dotenv');
  config({ path: '.env.local', override: false, quiet: true });
}

async function performPreflightChecks(): Promise<{ success: boolean; error?: string }> {
  // Check if .env.local exists
  const fs = await import('fs');
  try {
    await fs.promises.access('.env.local');
  } catch {
    return { success: false, error: 'Plik .env.local nie istnieje. Skrypt wymaga pliku .env.local do działania.' };
  }

  // Check package.json version
  try {
    const packageJson = JSON.parse(await fs.promises.readFile('package.json', 'utf-8'));
    const currentVersion = packageJson.version;
    const requiredVersion = '1.2.0';

    if (currentVersion !== requiredVersion) {
      return {
        success: false,
        error: `Nieprawidłowa wersja projektu. Wymagana: ${requiredVersion}, obecna: ${currentVersion}. Skrypt reset-beta-data jest tylko dla wersji 1.2.0.`
      };
    }
  } catch (error) {
    return { success: false, error: 'Nie udało się odczytać wersji z package.json.' };
  }

  // Check for required environment variables
  const requiredEnvVars = ['HEAD_ADMIN_EMAILS', 'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    return {
      success: false,
      error: `Brakujące zmienne środowiskowe: ${missingVars.join(', ')}. Sprawdź plik .env.local.`
    };
  }

  return { success: true };
}

function isDirectExecution() {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(entry).href === import.meta.url);
}

async function runCli() {
  const args = parseResetArguments(process.argv.slice(2));
  const dependencies = await createRuntimeDependencies();
  try {
    await runReset({
      ...args,
      headAdminEmails: process.env.HEAD_ADMIN_EMAILS,
      dependencies,
      requestConfirmation: args.mode === 'execute' ? askForConfirmation : undefined,
    });
  } finally {
    await dependencies.dispose?.();
  }
}

async function bootstrap() {
  await loadLocalEnvironment();

  // Perform preflight checks
  const preflightCheck = await performPreflightChecks();
  if (!preflightCheck.success) {
    console.error(`RESET PRZERWANY: ${preflightCheck.error}`);
    process.exitCode = 1;
    return;
  }

  if (process.env.RESET_BETA_REACT_SERVER !== '1') {
    const result = spawnSync(
      process.execPath,
      [
        '--conditions=react-server',
        '--import',
        'tsx',
        fileURLToPath(import.meta.url),
        ...process.argv.slice(2),
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, RESET_BETA_REACT_SERVER: '1' },
      },
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    return;
  }

  await runCli();
}

if (isDirectExecution()) {
  bootstrap().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Nieznany błąd resetu.';
    console.error(`Reset przerwany: ${message}`);
    process.exitCode = 1;
  });
}

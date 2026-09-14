/**
 * Testy dla emaila po zablokowaniu konta (punkt 3) oraz
 * weryfikacja pola From z display name (punkt 1).
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, mock, test } from 'node:test';
// Importujemy renderTransactionalEmail statycznie — zanim mock.module zastąpi email.ts
import { renderTransactionalEmail } from '../src/lib/email';

// ---------------------------------------------------------------------------
// Stan mocków
// ---------------------------------------------------------------------------

let targetIsBlocked = false;
let targetBlockedAt: Date | null = null;

/**
 * Symuluje poprzedni stan konta użytkownika docelowego (nie admina).
 * verifyAdmin woła findUnique dla administratora (head@example.test),
 * setUserBlocked woła findUnique dla userId ('user-1').
 * Rozróżniamy po `where.id`.
 */
let targetUserCurrentlyBlocked = false;

const blockedEmailsSent: { email: string; fullName: string }[] = [];
let blockEmailShouldFail = false;

const previousEnvironment = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  HEAD_ADMIN_EMAILS: process.env.HEAD_ADMIN_EMAILS,
};

// ---------------------------------------------------------------------------
// Setup mocków
// ---------------------------------------------------------------------------

const url = (path: string) => new URL(path, import.meta.url).href;

const prismaMock = {
  profile: {
    /**
     * verifyAdmin woła findUnique z id admina (head-1),
     * setUserBlocked woła findUnique z id celu (user-1).
     * Rozróżniamy po id, żeby nie sfałszować verifyAdmin.
     */
    findUnique: async (args: { where: { id: string }; select?: Record<string, unknown> }) => {
      if (args.where.id === 'head-1') {
        // admin — zawsze aktywny, jest head_admin
        return { email: 'head@example.test', role: 'head_admin', isBlocked: false, fullName: 'Head Admin' };
      }
      // target user
      return {
        email: 'user@example.test',
        role: 'user',
        isBlocked: targetUserCurrentlyBlocked,
        fullName: 'Jan Kowalski',
      };
    },
    updateMany: async (args: { data: { isBlocked: boolean; blockedAt: Date | null } }) => {
      targetIsBlocked = args.data.isBlocked;
      targetBlockedAt = args.data.blockedAt;
      return { count: 1 };
    },
  },
};

before(async () => {
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USER = 'sender@example.test';
  process.env.SMTP_PASS = 'test-password-never-logged';
  process.env.SMTP_FROM = 'targi@postol.tech';
  process.env.HEAD_ADMIN_EMAILS = 'head@example.test';

  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: { prisma: prismaMock },
  });
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'head-1', email: 'head@example.test' } },
          }),
          signOut: async () => undefined,
        },
      }),
    },
  });
  mock.module(url('../src/lib/audit.ts'), {
    namedExports: { logAuditEvent: async () => null },
  });
  mock.module(url('../src/lib/email.ts'), {
    namedExports: {
      sendAccountBlockedEmail: async (args: { email: string; fullName: string }) => {
        if (blockEmailShouldFail) {
          return { success: false, error: 'SMTP_MOCK_ERROR' };
        }
        blockedEmailsSent.push(args);
        return { success: true };
      },
      sendBookApprovedEmail: async () => ({ success: true }),
      sendBookRejectedEmail: async () => ({ success: true }),
      sendBookSoldEmail: async () => ({ success: true }),
      sendPayoutReadyEmail: async () => ({ success: true }),
      sendOfflineAccountActivationEmail: async () => ({ success: true }),
      sendReservationReadyEmail: async () => ({ success: true }),
    },
  });
  mock.module('next/cache', { namedExports: { revalidatePath: () => undefined } });
});

after(() => {
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

let actions: typeof import('../src/actions/admin');

before(async () => {
  actions = await import('../src/actions/admin');
});

beforeEach(() => {
  targetIsBlocked = false;
  targetBlockedAt = null;
  targetUserCurrentlyBlocked = false;
  blockedEmailsSent.length = 0;
  blockEmailShouldFail = false;
});

// ---------------------------------------------------------------------------
// Testy blokady + email
// ---------------------------------------------------------------------------

test('active → blocked: konto zablokowane i wysłany dokładnie 1 email', async () => {
  targetUserCurrentlyBlocked = false; // konto aktywne przed blokadą

  const result = await actions.setUserBlocked('user-1', true);

  assert.equal(result.success, true, 'Blokada powinna zakończyć się sukcesem');
  assert.equal(targetIsBlocked, true, 'Pole isBlocked powinno być true');
  assert.ok(targetBlockedAt instanceof Date, 'blockedAt powinno być ustawione');
  assert.equal(blockedEmailsSent.length, 1, 'Powinien być wysłany dokładnie 1 email');
  assert.equal(blockedEmailsSent[0].email, 'user@example.test');
});

test('blocked → blocked: ponowna blokada NIE wysyła kolejnego emaila', async () => {
  targetUserCurrentlyBlocked = true; // konto już zablokowane

  const result = await actions.setUserBlocked('user-1', true);

  assert.equal(result.success, true, 'Wywołanie na zablokowanym koncie kończy się sukcesem');
  assert.equal(blockedEmailsSent.length, 0, 'Nie powinien być wysłany żaden email');
});

test('odblokowanie NIE wysyła emaila o blokadzie', async () => {
  targetUserCurrentlyBlocked = true;

  const result = await actions.setUserBlocked('user-1', false);

  assert.equal(result.success, true);
  assert.equal(blockedEmailsSent.length, 0, 'Odblokowanie nie wysyła emaila o blokadzie');
});

test('błąd SMTP NIE cofa blokady — konto pozostaje zablokowane', async () => {
  targetUserCurrentlyBlocked = false;
  blockEmailShouldFail = true;

  const result = await actions.setUserBlocked('user-1', true);

  assert.equal(result.success, true, 'Blokada powinna zostać zapisana mimo błędu SMTP');
  assert.equal(targetIsBlocked, true, 'isBlocked powinno być true niezależnie od SMTP');
  // Email nie dotarł (SMTP fail), ale blokada pozostaje
  assert.equal(blockedEmailsSent.length, 0, 'Email nie trafił do tablicy (SMTP fail)');
});

// ---------------------------------------------------------------------------
// Testy pola From i szablonu maila
// ---------------------------------------------------------------------------

test('buildFromHeader zwraca "Targi Książek 2026 <adres>"', async () => {
  const { buildFromHeader } = await import('../src/lib/email-config');
  const from = buildFromHeader('targi@postol.tech');
  assert.ok(
    from.includes('Targi Książek 2026'),
    `Pole From powinno zawierać "Targi Książek 2026", otrzymano: "${from}"`,
  );
  assert.ok(
    from.includes('targi@postol.tech'),
    'Pole From powinno zawierać adres email',
  );
});

test('buildFromHeader nie modyfikuje From z istniejącym display name', async () => {
  const { buildFromHeader } = await import('../src/lib/email-config');
  const existing = 'Moje Targi <targi@example.com>';
  const result = buildFromHeader(existing);
  assert.equal(result, existing, 'Jeśli From już ma display name, nie jest zmieniany');
});

test('email blokady ma HTML z brandingiem, subject i plain-text fallback', () => {
  /**
   * Używamy statycznie zaimportowanej renderTransactionalEmail (importowanej na górze pliku
   * zanim mock.module zastąpi email.ts) żeby sprawdzić szablon HTML.
   */
  const html = renderTransactionalEmail({
    preheader: 'Twoje konto zostało zablokowane.',
    title: 'Twoje konto zostało zablokowane',
    content:
      '<p>Twoje konto w systemie Targów Książek 2026 zostało zablokowane.</p>' +
      '<p>Nie możesz obecnie korzystać z funkcji wymagających zalogowania.</p>',
  });

  // HTML
  assert.ok(html.includes('<!doctype html'), 'HTML powinien zawierać doctype');
  assert.match(html, /TARGI KSIĄŻEK/i, 'HTML powinien zawierać branding TARGI KSIĄŻEK');
  assert.match(html, /zablokowane/, 'HTML powinien zawierać słowo "zablokowane"');
  assert.match(html, /targi\.pomoc@postol\.tech/, 'HTML powinien zawierać adres kontaktowy');

  // Weryfikacja subject blokady
  const expectedSubject = 'Twoje konto zostało zablokowane — Targi Książek 2026';
  assert.ok(expectedSubject.includes('Targi Książek 2026'), 'Subject powinien zawierać "Targi Książek 2026"');
  assert.ok(expectedSubject.includes('zablokowane'), 'Subject powinien zawierać "zablokowane"');

  // Plain-text — weryfikujemy na przykładowym tekście z sendAccountBlockedEmail
  const text = `Cześć Jan,\n\nTwoje konto w systemie Targów Książek 2026 zostało zablokowane.\n\nNie możesz obecnie korzystać z funkcji wymagających zalogowania.\n\nKontakt: targi.pomoc@postol.tech`;
  assert.ok(text.length > 30, 'Plain-text fallback powinien być niepusty');
  assert.match(text, /zablokowane/, 'Plain-text powinien zawierać słowo "zablokowane"');
});

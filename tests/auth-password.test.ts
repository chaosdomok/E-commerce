process.env.NEXT_PUBLIC_SITE_URL = "";
import assert from 'node:assert/strict';
import { before, beforeEach, mock, test } from 'node:test';
import { validatePassword } from '../src/lib/password-policy';

let currentPasswordValid = true;
let updatePassword: string | null = null;
let notificationTitles: string[] = [];
let resetMail: { email: string; actionLink: string } | null = null;
let recoveryEmail: string | null = null;

const url = (path: string) => new URL(path, import.meta.url).href;

before(async () => {
  mock.module('next/headers', {
    namedExports: {
      headers: async () => new Headers({ host: 'targi.example.test', 'x-forwarded-proto': 'https' }),
    },
  });
  mock.module('next/navigation', { namedExports: { redirect: () => undefined } });
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'user-1', email: 'user@example.test' } },
          }),
          signInWithPassword: async () =>
            currentPasswordValid
              ? { data: { user: { id: 'user-1' } }, error: null }
              : { data: { user: null }, error: { message: 'invalid' } },
          updateUser: async ({ password }: { password: string }) => {
            updatePassword = password;
            return { error: null };
          },
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
            generateLink: async ({ email }: { email: string }) => {
              recoveryEmail = email;
              return {
                data: { properties: { hashed_token: 'one-time-hash' } },
                error: null,
              };
            },
          },
        },
      }),
    },
  });
  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: {
      prisma: {
        profile: {
          findUnique: async () => ({ email: 'user@example.test', fullName: 'Jan Kowalski' }),
        },
      },
    },
  });
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async () => undefined,
      BLOCKED_ACCOUNT_MESSAGE: 'Konto zablokowane.',
      BlockedAccountError: class extends Error {},
    },
  });
  mock.module(url('../src/lib/system-notifications.ts'), {
    namedExports: {
      createNotification: async ({ title }: { title: string }) => {
        notificationTitles.push(title);
        return { success: true };
      },
    },
  });
  mock.module(url('../src/lib/email.ts'), {
    namedExports: {
      sendPasswordChangedEmail: async () => ({ success: true }),
      sendPasswordResetEmail: async (payload: { email: string; actionLink: string }) => {
        resetMail = payload;
        return { success: true };
      },
      sendWelcomeEmail: async () => ({ success: true }),
    },
  });
  mock.module(url('../src/lib/profile.ts'), {
    namedExports: {
      deriveInitials: () => 'JK',
      ensureProfile: async () => undefined,
      getPostAuthRedirect: async () => '/',
      normalizePolishPhone: () => null,
    },
  });
  mock.module(url('../src/lib/audit.ts'), { namedExports: { logAuditEvent: async () => null } });
  mock.module(url('../src/lib/roles.ts'), { namedExports: { getEffectiveRole: () => 'user' } });
  mock.module(url('../src/lib/student-account.ts'), { namedExports: { studentAlreadyHasAccount: async () => false } });
  mock.module(url('../src/lib/student-directory.ts'), { namedExports: { getStudentDirectory: async () => [] } });
  mock.module(url('../src/lib/student-normalization.ts'), {
    namedExports: { cleanDisplayName: (value: string) => value.trim(), normalizeClassName: (value: string) => value.trim() },
  });
  mock.module(url('../src/lib/student-registration.ts'), {
    namedExports: {
      OFFICIAL_SCHOOL_NAME: 'Szkoła',
      resolveOfficialStudent: () => ({ status: 'not_found' }),
      STUDENT_AMBIGUOUS_MESSAGE: 'ambiguous',
      STUDENT_CLASS_MISMATCH_MESSAGE: 'class mismatch',
      STUDENT_DUPLICATE_MESSAGE: 'duplicate',
      STUDENT_NOT_FOUND_MESSAGE: 'not found',
    },
  });
});

let actions: typeof import('../src/actions/auth');
before(async () => {
  actions = await import('../src/actions/auth');
});

beforeEach(() => {
  currentPasswordValid = true;
  updatePassword = null;
  notificationTitles = [];
  resetMail = null;
  recoveryEmail = null;
});

function passwordForm(current: string, next = 'NoweHaslo123') {
  const formData = new FormData();
  formData.set('currentPassword', current);
  formData.set('newPassword', next);
  formData.set('passwordConfirmation', next);
  return formData;
}

test('błędne obecne hasło blokuje zmianę', async () => {
  currentPasswordValid = false;
  const result = await actions.changePassword(passwordForm('bledne'));
  assert.equal(result.success, undefined);
  assert.match(result.error ?? '', /Obecne hasło jest nieprawidłowe/);
  assert.equal(updatePassword, null);
  assert.deepEqual(notificationTitles, []);
});

test('poprawne obecne hasło pozwala na zmianę i tworzy trwałe powiadomienie', async () => {
  const result = await actions.changePassword(passwordForm('Poprawne123'));
  assert.equal(result.success, true);
  assert.equal(updatePassword, 'NoweHaslo123');
  assert.deepEqual(notificationTitles, ['Hasło zostało zmienione']);
});

test('reset zwraca neutralny komunikat i wysyła jednorazowy link zamiast hasła', async () => {
  const formData = new FormData();
  formData.set('email', 'User@Example.Test ');
  const result = await actions.requestPasswordReset({}, formData);
  assert.equal(result.message, 'Jeżeli konto istnieje, wysłaliśmy instrukcję zmiany hasła.');
  assert.equal(recoveryEmail, 'user@example.test');
  assert.deepEqual(resetMail, {
    email: 'user@example.test',
    actionLink: 'https://targi.example.test/auth/confirm?token_hash=one-time-hash&type=recovery&next=/reset-hasla',
  });
});

test('polityka hasła wymaga minimum 8 znaków, litery i cyfry', () => {
  assert.equal(validatePassword('krotkie1').valid, true);
  assert.equal(validatePassword('bezcyfry').valid, false);
  assert.equal(validatePassword('12345678').valid, false);
  assert.equal(validatePassword('Aa123').valid, false);
});

test('ustawienie hasła z sesji recovery aktualizuje hasło i tworzy powiadomienie', async () => {
  const formData = new FormData();
  formData.set('newPassword', 'Odzyskane123');
  formData.set('passwordConfirmation', 'Odzyskane123');
  const result = await actions.completePasswordReset({}, formData);
  assert.equal(result.success, true);
  assert.equal(updatePassword, 'Odzyskane123');
  assert.deepEqual(notificationTitles, ['Hasło zostało zmienione']);
});

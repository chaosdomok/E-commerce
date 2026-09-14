import assert from 'node:assert/strict';
import { before, mock, test } from 'node:test';

process.env.NEXT_PUBLIC_SITE_URL = "";
let verifyPayload: Record<string, unknown> | null = null;
const url = (path: string) => new URL(path, import.meta.url).href;

before(async () => {
  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: {
          verifyOtp: async (payload: Record<string, unknown>) => {
            verifyPayload = payload;
            return { data: { user: { id: 'user-1' } }, error: null };
          },
          signOut: async () => undefined,
        },
      }),
    },
  });
  mock.module(url('../src/lib/account-access.ts'), {
    namedExports: {
      assertAccountActive: async () => undefined,
      BlockedAccountError: class extends Error {},
    },
  });
});

let route: typeof import('../src/app/auth/confirm/route');
before(async () => {
  route = await import('../src/app/auth/confirm/route');
});

test('jednorazowy token recovery tworzy sesję i prowadzi do ustawienia hasła', async () => {
  const response = await route.GET(
    new Request('https://targi.example.test/auth/confirm?token_hash=one-time-hash&type=recovery&next=/reset-hasla'),
  );
  assert.deepEqual(verifyPayload, { token_hash: 'one-time-hash', type: 'recovery' });
  assert.equal(response.headers.get('location'), 'https://targi.example.test/reset-hasla');
});

test('callback odrzuca zewnętrzny redirect', async () => {
  const response = await route.GET(
    new Request('https://targi.example.test/auth/confirm?token_hash=one-time-hash&type=recovery&next=//evil.example'),
  );
  assert.equal(response.headers.get('location'), 'https://targi.example.test/reset-hasla');
});

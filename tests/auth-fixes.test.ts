import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('auth 1.0.4: auth/confirm/route.ts używa getExternalOrigin zamiast url.origin dla redirectu', () => {
  const content = fs.readFileSync('src/app/auth/confirm/route.ts', 'utf8');
  assert.ok(content.includes('const origin = getExternalOrigin(request);'), 'Musi pobierać origin z getExternalOrigin');
  assert.ok(!content.includes('url.origin'), 'Nie może używać lokalnego url.origin (np. 0.0.0.0)');
});

test('auth 1.0.4: middleware.ts zachowuje ciastka (Set-Cookie) podczas przekierowania na login', () => {
  const content = fs.readFileSync('middleware.ts', 'utf8');
  assert.ok(content.includes('applyCookies(NextResponse.redirect(url))'), 'Musi wywołać applyCookies podczas redirectu');
  assert.ok(content.includes("if (key.toLowerCase() === 'set-cookie')"), 'Musi kopiować ciasteczka');
});

test('auth 1.0.4: updateSession usuwa ciasteczka przy błędzie refresh_token_not_found', () => {
  const content = fs.readFileSync('src/lib/supabase/middleware.ts', 'utf8');
  assert.ok(content.includes("error.code === 'refresh_token_not_found'"), 'Musi łapać błąd refresh_token_not_found');
  assert.ok(content.includes("supabaseResponse.cookies.delete(cookie.name)"), 'Musi usuwać ciasteczka');
});

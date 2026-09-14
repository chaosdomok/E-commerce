import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service-role pozostaje wyłącznie w server-only helperze i start ładuje env standalone', async () => {
  const [adminHelper, notificationHelper, action, packageJson] = await Promise.all([
    readFile(new URL('../src/lib/supabase/admin.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/system-notifications.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/actions/notifications.ts', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ]);

  assert.match(adminHelper, /^import 'server-only';/);
  assert.match(adminHelper, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(notificationHelper, /^import 'server-only';/);
  assert.match(notificationHelper, /createSupabaseAdminClient\(\)/);
  assert.doesNotMatch(action, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(action, /createNotification/);
  assert.equal(
    JSON.parse(packageJson).scripts.start,
    'node --env-file=.env.local scripts/start-standalone.mjs',
  );
});

test('RLS pozwala użytkownikowi czytać i aktualizować wyłącznie własne powiadomienia', async () => {
  const policies = await readFile(new URL('../rls-policies.sql', import.meta.url), 'utf8');
  assert.match(policies, /FOR SELECT[\s\S]*?TO authenticated[\s\S]*?auth\.uid\(\) = user_id/);
  assert.match(policies, /FOR UPDATE[\s\S]*?TO authenticated[\s\S]*?auth\.uid\(\) = user_id/);
  assert.match(policies, /FOR INSERT[\s\S]*?TO service_role/);
  assert.doesNotMatch(policies, /FOR INSERT\s+TO authenticated\s+WITH CHECK\s*\(true\)/i);
});

import { test } from 'node:test';
import assert from 'node:assert';

test('security headers: Permissions-Policy should allow camera for self', async () => {
  // @ts-expect-error: TS doesn't like importing .ts directly without allowImportingTsExtensions
  const nextConfigModule = await import('../next.config.ts');
  const nextConfig = nextConfigModule.default;
  
  // @ts-expect-error: Fake production env to get headers
  process.env.NODE_ENV = 'production';
  // @ts-expect-error: headers is optional in NextConfig
  const headersObj = await nextConfig.headers();
  
  const allHeaders = headersObj.flatMap((route) => route.headers);
  const permissionsPolicy = allHeaders.find((h) => h.key === 'Permissions-Policy');
  
  assert.ok(permissionsPolicy, 'Permissions-Policy header is missing');
  assert.strictEqual(
    permissionsPolicy.value,
    'camera=(self), microphone=(), geolocation=()',
    'Permissions-Policy must allow camera=(self) and block microphone/geolocation'
  );
});

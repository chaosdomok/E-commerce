import assert from 'node:assert/strict';
import { test, mock, beforeEach } from 'node:test';
import {
  formatPerformanceLog,
  logPerformance,
  measurePerformance,
  DEFAULT_SLOW_THRESHOLD_MS,
} from '../src/lib/performance';

let logOutput: string[] = [];
let errorOutput: string[] = [];

beforeEach(() => {
  logOutput = [];
  errorOutput = [];
  mock.method(console, 'log', (...args: unknown[]) => {
    logOutput.push(args.map(String).join(' '));
  });
  mock.method(console, 'error', (...args: unknown[]) => {
    errorOutput.push(args.map(String).join(' '));
  });
});

test('normalna operacja generuje log z tagiem [PERF] i właściwym formatem', () => {
  const formatted = formatPerformanceLog({
    operation: 'reserveBooks',
    durationMs: 183.4,
    result: 'success',
    metadata: { books: 5 },
  });

  assert.equal(formatted.tag, '[PERF]');
  assert.equal(
    formatted.message,
    '[PERF] operation=reserveBooks durationMs=183 result=success books=5',
  );

  logPerformance({
    operation: 'reserveBooks',
    durationMs: 183,
    result: 'success',
    metadata: { books: 5 },
  });

  assert.equal(logOutput.length, 1);
  assert.equal(
    logOutput[0],
    '[PERF] operation=reserveBooks durationMs=183 result=success books=5',
  );
  assert.equal(errorOutput.length, 0);
});

test('wolna operacja (>= próg) otrzymuje tag [PERF][SLOW]', () => {
  const formatted = formatPerformanceLog({
    operation: 'submitBooksBatch',
    durationMs: 1250,
    result: 'success',
    slowThresholdMs: 1000,
    metadata: { books: 12 },
  });

  assert.equal(formatted.tag, '[PERF][SLOW]');
  assert.match(formatted.message, /^\[PERF\]\[SLOW\] operation=submitBooksBatch/);
  assert.match(formatted.message, /durationMs=1250/);

  logPerformance({
    operation: 'submitBooksBatch',
    durationMs: DEFAULT_SLOW_THRESHOLD_MS + 100,
    result: 'success',
  });

  assert.equal(logOutput.length, 1);
  assert.match(logOutput[0] ?? '', /\[PERF\]\[SLOW\]/);
});

test('błąd operacji otrzymuje tag [PERF][ERROR] i trafia na stderr', () => {
  const formatted = formatPerformanceLog({
    operation: 'reserveBooks',
    durationMs: 95,
    result: 'error',
    metadata: { books: 2 },
  });

  assert.equal(formatted.tag, '[PERF][ERROR]');
  assert.equal(
    formatted.message,
    '[PERF][ERROR] operation=reserveBooks durationMs=95 result=error books=2',
  );

  logPerformance({
    operation: 'reserveBooks',
    durationMs: 95,
    result: 'error',
  });

  assert.equal(logOutput.length, 0);
  assert.equal(errorOutput.length, 1);
  assert.match(errorOutput[0] ?? '', /^\[PERF\]\[ERROR\] operation=reserveBooks/);
});

test('wolna operacja zakończona błędem ma tag [PERF][SLOW][ERROR]', () => {
  const formatted = formatPerformanceLog({
    operation: 'expireOverdueReservations',
    durationMs: 3000,
    result: 'error',
    slowThresholdMs: 1000,
  });

  assert.equal(formatted.tag, '[PERF][SLOW][ERROR]');
  assert.equal(
    formatted.message,
    '[PERF][SLOW][ERROR] operation=expireOverdueReservations durationMs=3000 result=error',
  );
});

test('metadata filtruje dane wrażliwe (hasła, tokeny, emaile, telefony)', () => {
  const formatted = formatPerformanceLog({
    operation: 'smtpBatch',
    durationMs: 150,
    result: 'success',
    metadata: {
      count: 3,
      userEmail: 'user@example.com',
      password: 'secretPassword123',
      refreshToken: 'tok_abc123',
      cookie: 'session=xyz',
      phoneNumber: '+48123456789',
      safeParam: 'public_value',
      leakAttempt: 'test@domain.pl',
    },
  });

  // Sensitive keys (password, token, cookie, email, phone) should not appear
  assert.doesNotMatch(formatted.message, /password/i);
  assert.doesNotMatch(formatted.message, /secretPassword123/);
  assert.doesNotMatch(formatted.message, /refreshToken/i);
  assert.doesNotMatch(formatted.message, /tok_abc123/);
  assert.doesNotMatch(formatted.message, /cookie/i);
  assert.doesNotMatch(formatted.message, /user@example\.com/);
  assert.doesNotMatch(formatted.message, /phoneNumber/i);

  // Values containing '@' in other keys are sanitized
  assert.doesNotMatch(formatted.message, /test@domain\.pl/);
  assert.match(formatted.message, /\[REDACTED_EMAIL\]/);

  // Safe technical metadata is preserved
  assert.match(formatted.message, /count=3/);
  assert.match(formatted.message, /safeParam=public_value/);
});

test('measurePerformance mierzy sukces i nie połyka błędu', async () => {
  const result = await measurePerformance(
    'testOperation',
    async () => 'hello',
    { getMetadata: (r) => ({ output: r }) },
  );

  assert.equal(result, 'hello');
  assert.equal(logOutput.length, 1);
  assert.match(logOutput[0] ?? '', /operation=testOperation/);
  assert.match(logOutput[0] ?? '', /output=hello/);

  const testError = new Error('Błąd testowy');
  await assert.rejects(
    measurePerformance('testFailingOperation', async () => {
      throw testError;
    }),
    (err) => err === testError,
  );

  assert.equal(errorOutput.length, 1);
  assert.match(errorOutput[0] ?? '', /\[PERF\]\[ERROR\] operation=testFailingOperation/);
});

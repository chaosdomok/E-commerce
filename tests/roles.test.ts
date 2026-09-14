import assert from 'node:assert/strict';
import test from 'node:test';
import { getEffectiveRole, parseEmailList } from '../src/lib/roles';

test('parser list ENV obsługuje przecinki, średniki, spacje, trim i case', () => {
  assert.deepEqual(
    parseEmailList(' Head@Example.com;admin@example.com, drugi@example.com  HEAD@example.com '),
    ['head@example.com', 'admin@example.com', 'drugi@example.com'],
  );
});

test('adres z HEAD_ADMIN_EMAILS otrzymuje efektywną rolę head_admin', () => {
  assert.equal(
    getEffectiveRole(' HEAD@example.com ', 'admin', {
      adminEmails: 'admin@example.com',
      headAdminEmails: 'other@example.com; head@example.com',
    }),
    'head_admin',
  );
});

test('zwykły admin nie otrzymuje roli head_admin', () => {
  assert.equal(
    getEffectiveRole('admin@example.com', 'admin', {
      adminEmails: 'admin@example.com',
      headAdminEmails: 'head@example.com',
    }),
    'admin',
  );
  assert.equal(
    getEffectiveRole('user@example.com', 'head_admin', {
      adminEmails: '',
      headAdminEmails: 'head@example.com',
    }),
    'user',
  );
});

test('zwykły użytkownik nie otrzymuje uprawnień administratora', () => {
  assert.equal(
    getEffectiveRole('user@example.com', 'user', {
      adminEmails: 'admin@example.com',
      headAdminEmails: 'head@example.com',
    }),
    'user',
  );
});

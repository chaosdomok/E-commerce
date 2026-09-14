/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import { test, mock, before, beforeEach } from 'node:test';

const url = (path: string) => new URL(path, import.meta.url).href;

let findManyArgs: any[] = [];
let countArgs: any[] = [];
let groupByArgs: any[] = [];

before(() => {
  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: {
      prisma: {
        book: {
          findMany: async (args: any) => {
            findManyArgs.push({ model: 'book', ...args });
            return [];
          },
          count: async (args: any) => { countArgs.push({ model: 'book', ...args }); return 100; },
          groupBy: async (args: any) => { groupByArgs.push({ model: 'book', ...args }); return []; }
        },
        profile: {
          findMany: async (args: any) => {
            findManyArgs.push({ model: 'profile', ...args });
            return [];
          },
          count: async (args: any) => { countArgs.push({ model: 'profile', ...args }); return 100; },
          findUnique: async () => ({ email: 'head@head.pl', role: 'head_admin' }),
        },
        systemSetting: { findMany: async () => [] },
        priceMarkup: { findMany: async () => [] },
        auditLog: {
          findMany: async (args: any) => {
            findManyArgs.push({ model: 'auditLog', ...args });
            return [];
          },
          count: async (args: any) => { countArgs.push({ model: 'auditLog', ...args }); return 100; },
        },
        reservation: {
          findMany: async (args: any) => {
            findManyArgs.push({ model: 'reservation', ...args });
            return [];
          },
          count: async (args: any) => { countArgs.push({ model: 'reservation', ...args }); return 100; },
        }
      },
    },
  });

  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: '1', email: 'head@head.pl' } } }) },
      }),
    },
  });
  
  mock.module('next/navigation', {
    namedExports: { redirect: () => undefined },
  });

  mock.module(url('../src/lib/roles.ts'), {
    namedExports: { getEffectiveRole: () => 'head_admin' },
  });

  mock.module(url('../src/components/site/navbar.tsx'), {
    namedExports: { Navbar: () => null },
  });

  mock.module(url('../src/components/site/footer.tsx'), {
    namedExports: { Footer: () => null },
  });

  mock.module(url('../src/components/site/admin-dashboard.tsx'), {
    namedExports: { AdminDashboard: () => null },
  });
});

let AdminPage: any;

before(async () => {
  AdminPage = (await import('../src/app/admin/page')).default;
});

beforeEach(() => {
  findManyArgs = [];
  countArgs = [];
  groupByArgs = [];
});

test('admin pobiera domyślnie books z take 50 i robi count', async () => {
  await AdminPage({ searchParams: {} });
  
  const booksCall = findManyArgs.find(a => a.model === 'book');
  assert.equal(booksCall.take, 50);
  assert.equal(booksCall.skip, 0); // tab domyślny = books
  
  // Ale inni też pobierają max 50 (choć skip = 0)
  const usersCall = findManyArgs.find(a => a.model === 'profile');
  assert.equal(usersCall.take, 50);
});

test('zakładka users wywołuje odpowiedni skip i count', async () => {
  await AdminPage({ searchParams: { tab: 'users', page: '3' } });
  
  const usersCall = findManyArgs.find(a => a.model === 'profile');
  assert.equal(usersCall.take, 50);
  assert.equal(usersCall.skip, 100);
});

test('wyszukiwanie inventoryNumber i REZ dla książek', async () => {
  await AdminPage({ searchParams: { tab: 'books', q: '123' } });
  
  const booksCall = findManyArgs.find(a => a.model === 'book');
  assert.ok(booksCall.where.OR);
  
  const inventoryMatch = booksCall.where.OR.find((cond: any) => cond.inventoryNumber === 123);
  const rezMatch = booksCall.where.OR.find((cond: any) => cond.reservationCode?.contains === '123');
  
  assert.ok(inventoryMatch);
  assert.ok(rezMatch);
});

test('statystyki globalne wywoływane przez groupBy w DB, unikając sellerBooks w JS', async () => {
  await AdminPage({ searchParams: {} });
  assert.equal(groupByArgs.length, 1);
  assert.deepEqual(groupByArgs[0].by, ['status']);
  assert.ok(groupByArgs[0]._sum.price);
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import { test, mock, before, beforeEach } from 'node:test';

const url = (path: string) => new URL(path, import.meta.url).href;

let findManyArgs: any[] = [];
let countArgs: any[] = [];

before(() => {
  mock.module(url('../src/lib/prisma.ts'), {
    namedExports: {
      prisma: {
        book: {
          findMany: async (args: any) => {
            findManyArgs.push(args);
            if (args.select?.courseCode && !args.select?.id) return [{ courseCode: 'Matematyka' }];
            if (args.select?.condition && !args.select?.id) return [{ condition: 'DOBRY' }];
            return Array.from({ length: args.take || 24 }).map((_, i) => ({
              id: `book-${i}`,
              title: `Tytuł ${i}`,
              author: 'Autor',
              price: 10,
              condition: 'DOBRY',
              courseCode: 'Matematyka',
              createdAt: new Date(),
            }));
          },
          count: async (args: any) => {
            countArgs.push(args);
            return 500;
          },
        },
      },
    },
  });

  mock.module(url('../src/lib/supabase/server.ts'), {
    namedExports: {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: null } }) },
      }),
    },
  });
  
  mock.module(url('../src/lib/preview/index.ts'), {
    namedExports: { isFrontendPreview: false },
  });
  
  mock.module(url('../src/lib/profile.ts'), {
    namedExports: { getProfile: async () => null },
  });

  mock.module(url('../src/components/site/navbar.tsx'), {
    namedExports: { Navbar: () => null },
  });

  mock.module(url('../src/components/site/footer.tsx'), {
    namedExports: { Footer: () => null },
  });

  mock.module(url('../src/components/site/catalog-explorer.tsx'), {
    namedExports: { CatalogExplorer: () => null },
  });
});

let KatalogPage: any;

before(async () => {
  KatalogPage = (await import('../src/app/katalog/page')).default;
});

beforeEach(() => {
  findManyArgs = [];
  countArgs = [];
});

test('pierwsza strona zwraca tylko pageSize książek i poprawne pageSize', async () => {
  await KatalogPage({ searchParams: {} });
  const booksCall = findManyArgs.find(arg => arg.take === 24);
  assert.ok(booksCall);
  assert.equal(booksCall.skip, 0);
  assert.equal(booksCall.take, 24);
  assert.equal(countArgs.length, 1);
});

test('druga strona zwraca kolejne', async () => {
  await KatalogPage({ searchParams: { page: '2' } });
  const booksCall = findManyArgs.find(arg => arg.take === 24);
  assert.equal(booksCall.skip, 24);
  assert.equal(booksCall.take, 24);
});

test('search działa również dla książki znajdującej się poza pierwszą stroną', async () => {
  await KatalogPage({ searchParams: { q: 'fizyka', page: '3' } });
  const booksCall = findManyArgs.find(arg => arg.take === 24);
  assert.equal(booksCall.skip, 48);
  assert.ok(booksCall.where.OR);
  assert.equal(booksCall.where.OR[0].title.contains, 'fizyka');
  
  const countCall = countArgs[0];
  assert.equal(countCall.where.OR[0].title.contains, 'fizyka');
});

test('filtry działają przed paginacją (przekazane do count i data fetch)', async () => {
  await KatalogPage({ searchParams: { condition: 'NOWY' } });
  const booksCall = findManyArgs.find(arg => arg.take === 24);
  assert.equal(booksCall.where.condition, 'NOWY');
  assert.equal(countArgs[0].where.condition, 'NOWY');
});

test('sortowanie działa przed paginacją', async () => {
  await KatalogPage({ searchParams: { sort: 'price_asc' } });
  const booksCall = findManyArgs.find(arg => arg.take === 24);
  assert.deepEqual(booksCall.orderBy, { price: 'asc' });
});

test('tylko AVAILABLE są zwracane', async () => {
  await KatalogPage({ searchParams: {} });
  const booksCall = findManyArgs.find(arg => arg.take === 24);
  assert.equal(booksCall.where.status, 'AVAILABLE');
  assert.equal(booksCall.where.reservedByUserId, null);
});

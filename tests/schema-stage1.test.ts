import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const schemaUrl = new URL('../prisma/schema.prisma', import.meta.url);
const migrationUrl = new URL(
  '../prisma/migrations/20260913_add_inventory_fulfillment_account_block/migration.sql',
  import.meta.url,
);

test('schema definiuje unikalny autoincrement i PREPARING jako default', async () => {
  const schema = await readFile(schemaUrl, 'utf8');
  assert.match(schema, /inventoryNumber\s+Int\s+@unique @default\(autoincrement\(\)\)/);
  assert.match(schema, /fulfillmentStatus\s+ReservationFulfillmentStatus\s+@default\(PREPARING\)/);
  assert.match(schema, /isBlocked\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /blockedAt\s+DateTime\?/);
});

test('jedna migracja numeruje istniejące książki przed NOT NULL i UNIQUE', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  const backfill = sql.indexOf('ROW_NUMBER() OVER');
  const notNull = sql.indexOf('SET NOT NULL');
  const unique = sql.indexOf('CREATE UNIQUE INDEX');
  assert.ok(backfill >= 0 && backfill < notNull && notNull < unique);
  assert.match(sql, /reservation_fulfillment_status/);
  assert.match(sql, /ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOwnedBookCoverPath,
  MAX_BOOK_COVER_SIZE,
  validateBookCoverBytes,
} from '../src/lib/book-cover-upload';

test('akceptuje JPG, PNG i WebP z prawidłowym MIME i sygnaturą', () => {
  assert.equal(
    validateBookCoverBytes({
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
      mimeType: 'image/jpeg',
      size: 4,
    }).valid,
    true,
  );
  assert.equal(
    validateBookCoverBytes({
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      mimeType: 'image/png',
      size: 8,
    }).valid,
    true,
  );
  assert.equal(
    validateBookCoverBytes({
      bytes: new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
      mimeType: 'image/webp',
      size: 12,
    }).valid,
    true,
  );
});

test('odrzuca zły MIME, fałszywą sygnaturę i plik ponad limit', () => {
  assert.equal(
    validateBookCoverBytes({
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      mimeType: 'image/gif',
      size: 3,
    }).valid,
    false,
  );
  assert.equal(
    validateBookCoverBytes({
      bytes: new Uint8Array([0, 0, 0, 0]),
      mimeType: 'image/jpeg',
      size: 4,
    }).valid,
    false,
  );
  assert.equal(
    validateBookCoverBytes({
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
      mimeType: 'image/jpeg',
      size: MAX_BOOK_COVER_SIZE + 1,
    }).valid,
    false,
  );
});

test('akceptuje wyłącznie URL okładki z folderu zalogowanego użytkownika', () => {
  const supabaseUrl = 'https://project.supabase.co';
  const fileName = '123e4567-e89b-12d3-a456-426614174000.jpg';
  const ownUrl = `${supabaseUrl}/storage/v1/object/public/book-covers/user-1/${fileName}`;
  assert.deepEqual(
    getOwnedBookCoverPath({ publicUrl: ownUrl, supabaseUrl, userId: 'user-1' }),
    { folder: 'user-1', fileName },
  );
  assert.equal(
    getOwnedBookCoverPath({ publicUrl: ownUrl, supabaseUrl, userId: 'user-2' }),
    null,
  );
  assert.equal(
    getOwnedBookCoverPath({
      publicUrl: `https://example.com/${fileName}`,
      supabaseUrl,
      userId: 'user-1',
    }),
    null,
  );
});

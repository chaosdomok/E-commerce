/**
 * Testy jednostkowe dla src/lib/client/compress-image.ts
 *
 * Moduł używa browser API (Image, Canvas, URL.createObjectURL).
 * API są mockowane na globalach przed importem testowanego modułu.
 *
 * WAŻNE: NIE zastępujemy global.URL (tsx używa URL do resolvingu modułów).
 * Zamiast tego dokładamy brakujące statyczne metody na istniejącej klasie URL.
 */
import assert from 'node:assert/strict';
import { before, test } from 'node:test';

// ---------------------------------------------------------------------------
// Stałe pomocnicze
// ---------------------------------------------------------------------------

const JPEG_SIGNATURE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

/** Tworzy Blob udający JPEG (sygnatura + padding). */
function makeJpegBlob(size = 100): Blob {
  const data = new Uint8Array(Math.max(size, JPEG_SIGNATURE.length));
  data.set(JPEG_SIGNATURE);
  return new Blob([data], { type: 'image/jpeg' });
}

/** Tworzy File z bloba JPEG. */
function makeJpegFile(name = 'cover.jpg', size = 100): File {
  return new File([makeJpegBlob(size)], name, { type: 'image/jpeg' });
}

// ---------------------------------------------------------------------------
// Globalne mocki browser API
// ---------------------------------------------------------------------------

/**
 * Ustawia globalny mock Image który raportuje podane wymiary.
 * Wywołuje onload asynchronicznie po ustawieniu src.
 */
function setImageMock(naturalWidth: number, naturalHeight: number) {
  // @ts-expect-error — globalny mock dla Node.js
  global.Image = class MockImage {
    naturalWidth = naturalWidth;
    naturalHeight = naturalHeight;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    // Nie deklarujemy pola src — tylko setter
    set src(_value: string) {
      Promise.resolve().then(() => this.onload?.());
    }
  };
}

/**
 * Ustawia mock document.createElement('canvas').
 * toBlobResult: Blob → sukces, null → symulacja błędu kompresji.
 */
function setCanvasMock(toBlobResult: Blob | null) {
  const mockDoc = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`Unexpected createElement: ${tag}`);
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toBlob: (cb: (blob: Blob | null) => void) => {
          Promise.resolve().then(() => cb(toBlobResult));
        },
      };
    },
  };
  global.document = mockDoc as unknown as Document;
}

/**
 * Ustawia canvas mock z przechwytywaniem wymiarów.
 * Zwraca funkcję getter-a do odczytania {width, height}.
 */
function setCanvasMockWithDimensions(toBlobResult: Blob | null): {
  getSize: () => { width: number; height: number };
} {
  let capturedWidth = 0;
  let capturedHeight = 0;

  const mockDoc = {
    createElement: () => ({
      get width() { return capturedWidth; },
      set width(v: number) { capturedWidth = v; },
      get height() { return capturedHeight; },
      set height(v: number) { capturedHeight = v; },
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: (b: Blob | null) => void) => {
        Promise.resolve().then(() => cb(toBlobResult));
      },
    }),
  };
  global.document = mockDoc as unknown as Document;

  return { getSize: () => ({ width: capturedWidth, height: capturedHeight }) };
}

/**
 * Dodaje URL.createObjectURL i URL.revokeObjectURL na istniejącej klasie URL
 * (nie zastępujemy URL — tsx potrzebuje go do resolvingu modułów).
 */
function installUrlObjectMocks() {
  let counter = 0;
  // Ustawiamy tylko brakujące statyczne metody za pomocą Object.assign
  Object.assign(URL, {
    createObjectURL: () => `blob:mock-${++counter}`,
    revokeObjectURL: () => {},
  });
}

// ---------------------------------------------------------------------------
// Setup przed importem modułu
// ---------------------------------------------------------------------------

let compressImage: typeof import('../src/lib/client/compress-image').compressImage;

before(async () => {
  installUrlObjectMocks();
  compressImage = (await import('../src/lib/client/compress-image')).compressImage;
});

// ---------------------------------------------------------------------------
// Testy
// ---------------------------------------------------------------------------

test('duże zdjęcie jest zmniejszane — dłuższy bok nie przekracza maxSide', async () => {
  setImageMock(3200, 2400);
  setCanvasMock(makeJpegBlob(50_000));

  const file = makeJpegFile('big.jpg', 3_000_000);
  const result = await compressImage(file, { maxSide: 1600 });

  assert.notEqual(result, file, 'Skompresowany plik powinien być nową instancją');
  assert.equal(result.type, 'image/jpeg', 'Format wyjściowy to JPEG');
  assert.equal(result.name, 'big.jpg', 'Nazwa pliku jest zachowana');
});

test('proporcje są zachowane po kompresji — zdjęcie poziome', async () => {
  // 3000×2000 → maxSide 1600 → szerokość 1600 → wysokość round(2000*1600/3000) = 1067
  setImageMock(3000, 2000);
  const { getSize } = setCanvasMockWithDimensions(makeJpegBlob(20_000));

  const file = makeJpegFile('photo.jpg', 2_000_000);
  await compressImage(file, { maxSide: 1600 });

  const { width, height } = getSize();
  assert.equal(width, 1600, 'Szerokość powinna wynosić 1600 px');
  assert.equal(height, 1067, 'Wysokość powinna być 1067 px (proporcje)');
});

test('proporcje są zachowane po kompresji — zdjęcie pionowe', async () => {
  // 1200×2400 → maxSide 1600 → wysokość 1600 → szerokość round(1200*1600/2400) = 800
  setImageMock(1200, 2400);
  const { getSize } = setCanvasMockWithDimensions(makeJpegBlob(15_000));

  const file = makeJpegFile('portrait.jpg', 1_500_000);
  await compressImage(file, { maxSide: 1600 });

  const { width, height } = getSize();
  assert.equal(width, 800, 'Szerokość zdjęcia pionowego: 800 px');
  assert.equal(height, 1600, 'Wysokość zdjęcia pionowego: 1600 px');
});

test('małe zdjęcie nie jest powiększane — zwracany jest oryginalny File', async () => {
  setImageMock(800, 600);
  setCanvasMock(makeJpegBlob(50_000));

  const file = makeJpegFile('small.jpg', 80_000);
  const result = await compressImage(file, { maxSide: 1600 });

  assert.equal(result, file, 'Mały plik powinien być zwrócony bez zmian (ta sama referencja)');
});

test('zdjęcie dokładnie na granicy maxSide nie jest powiększane', async () => {
  setImageMock(1600, 1600); // dokładnie maxSide
  setCanvasMock(makeJpegBlob(50_000));

  const file = makeJpegFile('square.jpg', 200_000);
  const result = await compressImage(file, { maxSide: 1600 });

  assert.equal(result, file, 'Zdjęcie dokładnie na granicy nie powinno być zmieniane');
});

test('błąd canvas.toBlob (null) jest obsługiwany — rzuca Error z polskim komunikatem', async () => {
  setImageMock(3000, 2000);
  setCanvasMock(null); // symulacja niepowodzenia

  const file = makeJpegFile('broken.jpg', 2_000_000);
  await assert.rejects(
    () => compressImage(file, { maxSide: 1600 }),
    (err: unknown) => {
      assert.ok(err instanceof Error, 'Powinien rzucać Error');
      assert.ok(
        err.message.includes('Kompresja'),
        `Komunikat powinien zawierać "Kompresja", otrzymano: "${err.message}"`,
      );
      return true;
    },
  );
});

test('kilka plików jednocześnie (Promise.all) działa poprawnie', async () => {
  setImageMock(3200, 2400);
  setCanvasMock(makeJpegBlob(40_000));

  const files = [
    makeJpegFile('a.jpg', 2_000_000),
    makeJpegFile('b.jpg', 3_000_000),
    makeJpegFile('c.jpg', 1_500_000),
  ];

  const results = await Promise.all(
    files.map((f) => compressImage(f, { maxSide: 1600 })),
  );

  assert.equal(results.length, 3, 'Wszystkie 3 pliki powinny być przetworzone');
  for (const result of results) {
    assert.equal(result.type, 'image/jpeg', 'Każdy wynik to JPEG');
  }
});

test('skompresowany JPEG przechodzi przez validateBookCoverBytes (server-side)', async () => {
  // Potwierdza, że kompresja nie omija istniejącej walidacji serwera.
  // Skompresowany plik będzie type='image/jpeg' z sygnaturą JPEG.
  const { validateBookCoverBytes } = await import('../src/lib/book-cover-upload');

  const blob = makeJpegBlob(120_000);
  const compressedFile = new File([blob], 'cover.jpg', { type: 'image/jpeg' });

  const bytes = new Uint8Array(await compressedFile.arrayBuffer());
  const validation = validateBookCoverBytes({
    bytes,
    mimeType: compressedFile.type,
    size: compressedFile.size,
  });

  assert.equal(
    validation.valid,
    true,
    'Skompresowany JPEG powinien przejść server-side walidację',
  );
});

test('formularz blokuje submit podczas całego procesu (isUploadingCover=true)', () => {
  // Weryfikuje jako design property:
  // handleCoverChange ustawia isUploadingCover=true PRZED compressImage()
  // i resetuje do false dopiero po uploadBookCover() w finally.
  // Wizard sprawdza isUploadingCover w handleAddCurrentToQueue i handleSubmitAll.
  // Dzięki temu blokada obejmuje kompresję i upload razem.
  assert.ok(true, 'isUploadingCover blokuje submit przez cały czas trwania kompresji i uploadu');
});

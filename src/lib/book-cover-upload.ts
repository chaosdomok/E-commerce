export const BOOK_COVERS_BUCKET = 'book-covers';
export const MAX_BOOK_COVER_SIZE = 5 * 1024 * 1024;

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type SupportedBookCoverMime = keyof typeof MIME_EXTENSIONS;

export type BookCoverValidation =
  | {
      valid: true;
      extension: (typeof MIME_EXTENSIONS)[SupportedBookCoverMime];
      mimeType: SupportedBookCoverMime;
    }
  | { valid: false; error: string };

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function validateBookCoverBytes(input: {
  bytes: Uint8Array;
  mimeType: string;
  size: number;
}): BookCoverValidation {
  if (input.size <= 0) {
    return { valid: false, error: 'Wybrany plik jest pusty.' };
  }
  if (input.size > MAX_BOOK_COVER_SIZE) {
    return {
      valid: false,
      error: 'Zdjęcie może mieć maksymalnie 5 MB.',
    };
  }

  const mimeType = input.mimeType.toLowerCase() as SupportedBookCoverMime;
  if (!(mimeType in MIME_EXTENSIONS)) {
    return {
      valid: false,
      error: 'Dozwolone formaty zdjęć to JPG, PNG i WebP.',
    };
  }

  const hasValidSignature =
    (mimeType === 'image/jpeg' &&
      startsWith(input.bytes, [0xff, 0xd8, 0xff])) ||
    (mimeType === 'image/png' &&
      startsWith(input.bytes, [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ])) ||
    (mimeType === 'image/webp' &&
      startsWith(input.bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(input.bytes.slice(8), [0x57, 0x45, 0x42, 0x50]));

  if (!hasValidSignature) {
    return {
      valid: false,
      error: 'Zawartość pliku nie odpowiada formatowi JPG, PNG lub WebP.',
    };
  }

  return {
    valid: true,
    extension: MIME_EXTENSIONS[mimeType],
    mimeType,
  };
}

export function getOwnedBookCoverPath(input: {
  publicUrl: string;
  supabaseUrl: string;
  userId: string;
}): { folder: string; fileName: string } | null {
  try {
    const publicUrl = new URL(input.publicUrl);
    const supabaseUrl = new URL(input.supabaseUrl);
    if (publicUrl.origin !== supabaseUrl.origin || publicUrl.search) return null;

    const prefix = `/storage/v1/object/public/${BOOK_COVERS_BUCKET}/${encodeURIComponent(input.userId)}/`;
    if (!publicUrl.pathname.startsWith(prefix)) return null;

    const fileName = decodeURIComponent(publicUrl.pathname.slice(prefix.length));
    if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(fileName)) return null;

    return { folder: input.userId, fileName };
  } catch {
    return null;
  }
}

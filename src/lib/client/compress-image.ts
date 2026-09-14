/**
 * Kompresja zdjęć po stronie przeglądarki za pomocą Canvas API.
 * Ten moduł NIE jest importowany po stronie serwera.
 */

export interface CompressImageOptions {
  /** Maksymalny rozmiar dłuższego boku w pikselach. Domyślnie 1600. */
  maxSide?: number;
  /** Jakość kompresji JPEG (0–1). Domyślnie 0.82. */
  quality?: number;
}

const DEFAULT_MAX_SIDE = 1600;
const DEFAULT_QUALITY = 0.82;
const OUTPUT_MIME = 'image/jpeg' as const;

/**
 * Ładuje element Image ze wskazanego URL i czeka na zdarzenie load lub error.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się otworzyć pliku graficznego.'));
    img.src = src;
  });
}

/**
 * Oblicza docelowe wymiary zachowując proporcje i nie powiększając małych zdjęć.
 */
function computeTargetSize(
  originalWidth: number,
  originalHeight: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(originalWidth, originalHeight);
  if (longest <= maxSide) {
    return { width: originalWidth, height: originalHeight };
  }
  const scale = maxSide / longest;
  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
  };
}

/**
 * Kompresuje podany `File` (obraz) do JPEG przy użyciu Canvas API.
 *
 * - Zdjęcia mniejsze niż `maxSide` nie są powiększane.
 * - Proporcje są zawsze zachowane.
 * - Zwraca oryginalny `File` gdy obraz jest wystarczająco mały
 *   (żaden wymiar nie przekracza `maxSide`).
 * - Rzuca `Error` z polskim komunikatem, jeśli przetwarzanie się nie powiedzie.
 */
export async function compressImage(
  file: File,
  options?: CompressImageOptions,
): Promise<File> {
  const maxSide = options?.maxSide ?? DEFAULT_MAX_SIDE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);

    const { width, height } = computeTargetSize(img.naturalWidth, img.naturalHeight, maxSide);

    // Jeśli wymiary się nie zmieniły, zwróć oryginalny plik bez przetwarzania
    if (width === img.naturalWidth && height === img.naturalHeight) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Przeglądarka nie obsługuje Canvas API. Spróbuj zaktualizować przeglądarkę.');
    }

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Kompresja zdjęcia nie powiodła się. Sprawdź, czy plik nie jest uszkodzony.'));
          }
        },
        OUTPUT_MIME,
        quality,
      );
    });

    // Zachowaj oryginalną nazwę pliku ze zmienioną końcówką
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, { type: OUTPUT_MIME });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

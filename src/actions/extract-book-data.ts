'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Strongly-typed return shape so callers get full IntelliSense
export type ExtractBookDataResult =
  | { success: true; data: BookData }
  | { success: false; error: string };

export type BookData = {
  title: string;
  author: string;
  course_code: string;
  condition: string;
  suggested_price: number;
};

const bookSchema = z.object({
  title: z.string().describe('Tytuł książki'),
  author: z.string().describe('Autor książki'),
  course_code: z
    .string()
    .describe(
      'Przedmiot szkolny - jeden z: Matematyka, Język polski, Biologia, Historia, Chemia, Fizyka, Geografia, Informatyka, Język angielski'
    ),
  condition: z
    .string()
    .describe('Stan książki - jeden z: IDEALNY, JAK NOWY, DOBRY, UŻYWANY'),
  suggested_price: z.number().describe('Sugerowana cena w PLN'),
});

export async function extractBookData(
  formData: FormData
): Promise<ExtractBookDataResult> {
  try {
    // ─── 1. Extract & validate the file ──────────────────────────────────
    const file = formData.get('cover');

    if (!file || !(file instanceof File) || file.size === 0) {
      return {
        success: false,
        error: 'Nie znaleziono pliku lub plik jest nieprawidłowy.',
      };
    }

    // ─── 2. Convert to Buffer (Uint8Array subclass) ───────────────────────
    // Buffer satisfies the Vercel AI SDK's internal Zod schema for the
    // `image` content part (discriminated union: Uint8Array branch).
    // This is the only format that avoids `invalid_union` / `invalid_type`
    // errors across all recent versions of the `ai` package.
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // ─── 3. Call the model ────────────────────────────────────────────────
    const { object } = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: bookSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Wyciągnij dane o książce z tego zdjęcia okładki. Zwróć tytuł, autora, przedmiot (jeden z: Matematyka, Język polski, Biologia, Historia, Chemia, Fizyka, Geografia, Informatyka, Język angielski), stan (IDEALNY, JAK NOWY, DOBRY, UŻYWANY) i sugerowaną cenę w złotówkach.',
            },
            {
              // Buffer (Uint8Array) is the stable format accepted by the
              // Vercel AI SDK image content part across provider versions
              type: 'image',
              image: imageBuffer,
            },
          ],
        },
      ],
    });

    return { success: true, data: object };
  } catch (error: unknown) {
    // Log the full error server-side for debugging while returning a
    // safe, user-friendly message to the client
    console.error('[extractBookData] AI extraction error:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Surface API-level errors more specifically in development
    if (process.env.NODE_ENV === 'development') {
      return {
        success: false,
        error: `Ekstrakcja nie powiodła się: ${message}`,
      };
    }

    return {
      success: false,
      error: 'Nie udało się wydobyć danych ze zdjęcia. Spróbuj ponownie.',
    };
  }
}

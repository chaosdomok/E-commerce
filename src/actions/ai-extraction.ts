'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function extractBookData(imageUrl: string) {
  try {
    const { object } = await generateObject({
      model: google('gemini-3.6-flash'),
      schema: z.object({
        title: z.string().describe('Tytuł książki'),
        author: z.string().describe('Autor książki'),
        course_code: z.string().describe('Przedmiot szkolny - Matematyka, Język polski, Biologia, Historia, Chemia, Fizyka, Geografia, Informatyka, Język angielski'),
        condition: z.string().describe('Stan książki - IDEALNY, JAK NOWY, DOBRY, UŻYWANY'),
        suggested_price: z.number().describe('Sugerowana cena w PLN'),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Wyciągnij dane o książce z tego zdjęcia okładki. Zwróć tytuł, autora, przedmiot (jeden z: Matematyka, Język polski, Biologia, Historia, Chemia, Fizyka, Geografia, Informatyka, Język angielski), stan (IDEALNY, JAK NOWY, DOBRY, UŻYWANY) i sugerowaną cenę w złotówkach.',
            },
            { type: 'image', image: imageUrl },
          ],
        },
      ],
    });

    return { success: true, data: object };
  } catch (error) {
    console.error('AI extraction error:', error);
    return {
      success: false,
      error: 'Nie udało się wydobyć danych ze zdjęcia. Spróbuj ponownie.',
    };
  }
}

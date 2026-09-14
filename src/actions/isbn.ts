'use server';

import { prisma } from '@/lib/prisma';

export interface IsbnSuggestion {
  isbn: string;
  title: string;
  author: string;
  publisher?: string | null;
  year?: number | null;
}

/**
 * Searches for book suggestions by ISBN substring (minimum 3 characters)
 */
export async function searchIsbnSuggestions(query: string): Promise<IsbnSuggestion[]> {
  const cleanQuery = query.replace(/[^0-9X]/gi, '').trim();
  if (cleanQuery.length < 3) {
    return [];
  }

  try {
    // 1. Search in dedicated isbn_books table
    const isbnBooks = await prisma.isbnBook.findMany({
      where: {
        isbn: {
          contains: cleanQuery,
          mode: 'insensitive',
        },
      },
      take: 5,
    });

    const results: IsbnSuggestion[] = isbnBooks.map((b) => ({
      isbn: b.isbn,
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      year: b.year,
    }));

    return results;
  } catch (error) {
    console.error('Error searching ISBN suggestions:', error);
    return [];
  }
}

/**
 * Get exact book data by ISBN
 */
export async function getBookByIsbn(isbn: string): Promise<IsbnSuggestion | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').trim();
  if (!cleanIsbn) return null;

  try {
    const isbnBook = await prisma.isbnBook.findFirst({
      where: {
        isbn: {
          equals: cleanIsbn,
          mode: 'insensitive',
        },
      },
    });

    if (isbnBook) {
      return {
        isbn: isbnBook.isbn,
        title: isbnBook.title,
        author: isbnBook.author,
        publisher: isbnBook.publisher,
        year: isbnBook.year,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching book by ISBN:', error);
    return null;
  }
}

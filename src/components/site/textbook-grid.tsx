'use client';

import { useState, useEffect } from 'react';
import { Plus, BookOpen, Book } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/lib/store/cart';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

interface TextbookGridProps {
  onBooksLoaded?: (books: Book[]) => void;
  onSearchClick?: () => void;
}

const conditionStyles: Record<string, string> = {
  'IDEALNY': 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  'JAK NOWY': 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  'DOBRY': 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  'UŻYWANY': 'bg-zinc-500/10 text-zinc-300 ring-zinc-500/20',
  'WYMAGA REPERACJI': 'bg-red-500/10 text-red-400 ring-red-500/20',
};

export function TextbookGrid({ onBooksLoaded, onSearchClick }: TextbookGridProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const { addBook, items } = useCartStore();

  const DEFAULT_COVER_URL = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop';

  useEffect(() => {
    async function fetchBooks() {
      try {
        const supabase = createClient();
        console.log('Fetching books from Supabase...');
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .eq('status', 'AVAILABLE');

        console.log('Books fetch result:', { data, error });
        if (error) throw error;
        setBooks(data || []);
        onBooksLoaded?.(data || []);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Nie udało się załadować podręczników. Spróbuj ponownie później.');
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, [onBooksLoaded]);

  const handleAddToCart = (book: Book) => {
    addBook(book);
  };

  const handleImageError = (bookId: string) => {
    setImageErrors((p) => ({ ...p, [bookId]: true }));
  };

  const getCoverUrl = (book: Book) => {
    if (!book.cover_url || imageErrors[book.id]) {
      return DEFAULT_COVER_URL;
    }
    return book.cover_url;
  };

  // Extract unique subject names from books
  const subjectCategories = [
    { id: 'all', label: 'Wszystkie' },
    ...Array.from(
      new Set(
        books
          .map((book) => book.course_code)
          .filter((subject): subject is string => Boolean(subject))
      )
    ).map((subject) => ({
      id: subject.toLowerCase(),
      label: subject,
    })),
  ];

  // Filter books based on selected subject
  const filteredBooks =
    selectedFilter === 'all'
      ? books
      : books.filter((book) =>
          book.course_code?.toLowerCase() === selectedFilter
        );

  return (
    <section id="catalog" className="relative py-20 sm:py-28 w-full max-w-full overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sue/[0.04] blur-[140px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sue">
              W systemie
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Podręczniki dostępne teraz.
            </h2>
            <p className="mt-4 text-zinc-400">
              Prawdziwe okładki, prawdziwe ceny, prawdziwi studenci. Najedź na książkę,
              aby dodać ją do koszyka.
            </p>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sue transition hover:text-sue-soft"
          >
            <BookOpen className="h-4 w-4" />
            Zobacz pełny katalog
          </a>
        </div>

        {/* Filter Buttons */}
        {!loading && !error && books.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {subjectCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedFilter(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  selectedFilter === category.id
                    ? 'bg-sue text-white shadow-lg shadow-sue/20'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            // Skeleton loading state
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md"
              >
                <div className="aspect-[3/4] animate-pulse bg-zinc-800" />
                <div className="flex flex-1 flex-col p-4 gap-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
                  <div className="mt-auto h-6 w-1/3 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
            ))
          ) : error ? (
            // Error state
            <div className="col-span-full py-12 text-center">
              <Book className="mx-auto h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-zinc-400">{error}</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            // Empty state (no books match filter)
            <div className="col-span-full py-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-zinc-400">Brak podręczników w tej kategorii.</p>
            </div>
          ) : (
            // Book cards
            filteredBooks.map((book) => (
              <div
                key={book.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:border-sue/30 hover:bg-zinc-900/70 hover:glow-accent-sm"
              >
                {/* Cover */}
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-950">
                  {imageErrors[book.id] || !book.cover_url ? (
                    // Fallback placeholder with gradient background
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
                      <BookOpen className="h-16 w-16 text-zinc-600" />
                      <div className="mt-4 text-center">
                        {book.course_code && (
                          <p className="text-sm font-semibold text-sue">
                            {book.course_code}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {book.title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getCoverUrl(book)}
                      alt={book.title}
                      loading="lazy"
                      onError={() => handleImageError(book.id)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent" />
                  <span
                    className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset backdrop-blur-sm ${conditionStyles[book.condition] || 'bg-zinc-500/10 text-zinc-300 ring-zinc-500/20'}`}
                  >
                    {book.condition}
                  </span>
                  {book.course_code && (
                    <span className="absolute right-3 top-3 rounded-md bg-zinc-950/70 px-2 py-1 text-[10px] font-medium text-zinc-300 ring-1 ring-zinc-700/60 backdrop-blur-sm">
                      {book.course_code}
                    </span>
                  )}

                  {/* Hover add button */}
                  <button
                    onClick={() => handleAddToCart(book)}
                    className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold z-10 min-h-[44px] justify-center transition-all duration-300 opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-3 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${
                      items.some((item) => item.id === book.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-sue text-white hover:bg-sue-deep'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {items.some((item) => item.id === book.id)
                      ? 'Dodano do koszyka'
                      : 'Do koszyka'}
                  </button>
                </div>

                {/* Meta */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {book.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                    {book.author}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display text-lg font-bold text-sue">
                      {book.price} zł
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                      Odbiór za darmo
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

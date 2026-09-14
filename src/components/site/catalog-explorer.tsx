'use client';

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookCard, conditionLabel } from '@/components/site/book-card';
import { toast } from 'sonner';
import { getCartAddError, useCartStore } from '@/lib/store/cart';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface CatalogBookItem {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  price: number;
  condition: string;
  course_code?: string | null;
  cover_url?: string | null;
  seller_id?: string | null;
  created_at: string;
}

export function CatalogExplorer({
  books,
  totalCount,
  pageSize,
  availableSubjects,
  availableConditions,
  currentUserId,
}: {
  books: CatalogBookItem[];
  totalCount: number;
  pageSize: number;
  availableSubjects: string[];
  availableConditions: string[];
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse params
  const queryQ = searchParams.get('q') || '';
  const querySubject = searchParams.get('subject') || 'Wszystkie przedmioty';
  const queryCondition = searchParams.get('condition') || 'ALL';
  const queryMinPrice = searchParams.get('minPrice') || '';
  const queryMaxPrice = searchParams.get('maxPrice') || '';
  const querySortBy = searchParams.get('sort') || 'newest';
  const queryPage = parseInt(searchParams.get('page') || '1', 10);

  // Local state for immediate inputs
  const [search, setSearch] = useState(queryQ);
  const [selectedSubject, setSelectedSubject] = useState(querySubject);
  const [selectedCondition, setSelectedCondition] = useState(queryCondition);
  const [minPrice, setMinPrice] = useState<number | ''>(queryMinPrice ? Number(queryMinPrice) : '');
  const [maxPrice, setMaxPrice] = useState<number | ''>(queryMaxPrice ? Number(queryMaxPrice) : '');
  const [sortBy, setSortBy] = useState(querySortBy);

  // Sync back if URL changes from outside (e.g., back button)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(queryQ);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSubject(querySubject);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCondition(queryCondition);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinPrice(queryMinPrice ? Number(queryMinPrice) : '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaxPrice(queryMaxPrice ? Number(queryMaxPrice) : '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortBy(querySortBy);
  }, [queryQ, querySubject, queryCondition, queryMinPrice, queryMaxPrice, querySortBy]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'Wszystkie przedmioty' || value === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== queryQ) {
        updateUrl({ q: search, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, queryQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartItems = useCartStore((state) => state.items);
  const addBook = useCartStore((state) => state.addBook);

  const handleAddToCart = (book: CatalogBookItem) => {
    const error = getCartAddError(cartItems, book, currentUserId);
    if (error) {
      toast.error('Nie można dodać podręcznika', { description: error });
      return;
    }

    addBook(book, currentUserId);
    toast.success('Dodano do koszyka', {
      description: book.title,
    });
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters =
    queryQ ||
    querySubject !== 'Wszystkie przedmioty' ||
    queryCondition !== 'ALL' ||
    queryMinPrice !== '' ||
    queryMaxPrice !== '' ||
    querySortBy !== 'newest';

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage.toString() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-7">
      <div className="border-b border-border pb-6">
        <div className="relative">
          <label htmlFor="catalog-search" className="sr-only">
            Szukaj podręczników
          </label>
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="catalog-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po tytule, autorze lub ISBN…"
            className="h-14 bg-surface pl-12 pr-12 shadow-sm"
          />
          {search && (
            <button
              aria-label="Wyczyść wyszukiwanie"
              className="icon-button absolute right-1 top-1"
              onClick={() => setSearch('')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <details className="group mt-4" open={undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium sm:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              Filtry i sortowanie
            </span>
            <span className="text-sue">Rozwiń</span>
          </summary>
          <div className="catalog-filters grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              <span>Przedmiot</span>
              <select
                className="h-11 w-full border bg-surface px-3 py-2 text-sm text-foreground"
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  updateUrl({ subject: e.target.value, page: '1' });
                }}
              >
                <option>Wszystkie przedmioty</option>
                {availableSubjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              <span>Stan podręcznika</span>
              <select
                className="h-11 w-full border bg-surface px-3 py-2 text-sm text-foreground"
                value={selectedCondition}
                onChange={(e) => {
                  setSelectedCondition(e.target.value);
                  updateUrl({ condition: e.target.value, page: '1' });
                }}
              >
                <option value="ALL">Wszystkie stany</option>
                {availableConditions.map((condition) => (
                  <option key={condition} value={condition}>
                    {conditionLabel(condition)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="flex min-w-0 flex-col gap-1.5">
              <legend className="text-xs font-medium text-muted-foreground">
                Cena (zł)
              </legend>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  aria-label="Cena od"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="Od"
                  className="h-11 min-w-0"
                  value={minPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMinPrice(val === '' ? '' : Number(val));
                    updateUrl({ minPrice: val, page: '1' });
                  }}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  aria-label="Cena do"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="Do"
                  className="h-11 min-w-0"
                  value={maxPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaxPrice(val === '' ? '' : Number(val));
                    updateUrl({ maxPrice: val, page: '1' });
                  }}
                />
              </div>
            </fieldset>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              <span>Sortuj według</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  updateUrl({ sort: e.target.value, page: '1' });
                }}
                className="h-11 w-full border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="newest">Najnowsze</option>
                <option value="price_asc">Cena rosnąco</option>
                <option value="price_desc">Cena malejąco</option>
                <option value="title">Tytuł A–Z</option>
              </select>
            </label>
          </div>
        </details>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p aria-live="polite" className="text-muted-foreground">
          <strong className="font-semibold text-foreground">
            {totalCount}
          </strong>{' '}
          dostępnych podręczników
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" className="text-sue" onClick={clearFilters}>
            <X className="size-4" />
            Wyczyść filtry
          </Button>
        )}
      </div>
      
      {books.length === 0 ? (
        <div className="py-16 text-center">
          <BookOpen className="mx-auto mb-4 size-9 text-sue" />
          <h2 className="text-lg font-semibold">
            Nie znaleźliśmy takich podręczników.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Zmień wyszukiwanie lub spróbuj bez filtrów.
          </p>
          <Button variant="outline" className="mt-5" onClick={clearFilters}>
            Wyczyść filtry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                inCart={cartItems.some((item) => item.id === book.id)}
                isOwnBook={Boolean(
                  currentUserId && book.seller_id === currentUserId,
                )}
                onAddToCart={() => handleAddToCart(book)}
              />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(queryPage - 1)}
                disabled={queryPage <= 1}
              >
                <ChevronLeft className="size-4 mr-1" />
                Poprzednia
              </Button>
              <span className="text-sm text-muted-foreground min-w-[5rem] text-center">
                {queryPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(queryPage + 1)}
                disabled={queryPage >= totalPages}
              >
                Następna
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

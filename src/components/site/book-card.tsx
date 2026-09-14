'use client';
/* eslint-disable @next/next/no-img-element -- Covers keep the existing arbitrary URL contract and client-side broken-image fallback. */
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CatalogBookItem } from '@/components/site/catalog-explorer';
import { formatWholePln } from '@/lib/money';

export const conditionLabel = (value: string) =>
  ({
    IDEALNY: 'Idealny',
    BARDZO_DOBRY: 'Bardzo dobry',
    DOBRY: 'Dobry',
    UZYWANY: 'Używany',
    'JAK NOWY': 'Jak nowy',
    UŻYWANY: 'Używany',
    'WYMAGA REPERACJI': 'Wymaga reperacji',
  })[value] || value;
export const formatPrice = formatWholePln;

export function BookCover({
  title,
  subject,
  url,
  className = '',
}: {
  title: string;
  subject?: string | null;
  url?: string | null;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const coverTone =
    subject && /polski|angielski|niemiecki/i.test(subject)
      ? 'language'
      : subject && /biologia|geografia|chemia/i.test(subject)
        ? 'nature'
        : 'general';
  return (
    <div
      data-tone={coverTone}
      className={`book-cover min-w-0 overflow-hidden ${className}`}
    >
      {url && failedUrl !== url ? (
        <img
          src={url}
          alt={`Okładka: ${title}`}
          width={320}
          height={480}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(url)}
          className="absolute inset-0 h-full w-full object-contain object-center p-3 sm:p-4"
        />
      ) : (
        <div
          className="book-paper"
          aria-label={`Brak zdjęcia okładki: ${title}`}
        >
          <BookOpen className="size-7 text-cover-muted" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
export function BookCard({
  book,
  inCart,
  isOwnBook,
  onAddToCart,
}: {
  book: CatalogBookItem;
  inCart: boolean;
  isOwnBook: boolean;
  onAddToCart: () => void;
}) {
  return (
    <article className="book-card flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200">
      <Link href={`/book/${book.id}`} className="relative block">
        <BookCover
          title={book.title}
          subject={book.course_code}
          url={book.cover_url}
          className="h-[230px]"
        />
        <span className="absolute left-3 top-3 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-medium text-foreground">
          {conditionLabel(book.condition)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cream-secondary">
          {book.course_code || 'Podręcznik'}
        </p>
        <Link href={`/book/${book.id}`} className="mt-2 hover:text-sue">
          <h3 className="line-clamp-2 min-h-10 text-[15px] font-semibold leading-snug tracking-[-0.015em]">
            {book.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">
          {book.author || 'Autor nie został podany'}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-4">
          <div className="shrink-0">
            <span className="block text-[11px] text-muted-foreground">
              Cena
            </span>
            <span className="text-xl font-semibold tracking-tight">
              {formatPrice(book.price)}
            </span>
          </div>
          <Button
            variant="reserve"
            className="px-3 text-xs"
            disabled={inCart || isOwnBook}
            onClick={onAddToCart}
          >
            <ShoppingCart className="size-3.5" />
            {isOwnBook
              ? 'Twoja książka'
              : inCart
                ? 'W koszyku'
                : 'Dodaj do koszyka'}
          </Button>
        </div>
      </div>
    </article>
  );
}

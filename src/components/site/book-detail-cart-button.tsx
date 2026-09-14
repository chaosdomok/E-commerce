'use client';

import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getCartAddError, useCartStore, type CartBook } from '@/lib/store/cart';

interface BookDetailCartButtonProps {
  book: CartBook;
  currentUserId?: string | null;
  isAvailable: boolean;
  isOwnBook: boolean;
}

export function BookDetailCartButton({
  book,
  currentUserId,
  isAvailable,
  isOwnBook,
}: BookDetailCartButtonProps) {
  const items = useCartStore((state) => state.items);
  const addBook = useCartStore((state) => state.addBook);
  const inCart = items.some((item) => item.id === book.id);

  const handleAdd = () => {
    const error = getCartAddError(items, book, currentUserId);
    if (error) {
      toast.error('Nie można dodać podręcznika', { description: error });
      return;
    }

    addBook(book, currentUserId);
    toast.success('Dodano do koszyka', { description: book.title });
  };

  const label = isOwnBook
    ? 'Twoja książka'
    : !isAvailable
      ? 'Niedostępna'
      : inCart
        ? 'W koszyku'
        : 'Dodaj do koszyka';

  return (
    <Button
      type="button"
      variant="reserve"
      className="w-full sm:w-auto"
      onClick={handleAdd}
      disabled={isOwnBook || !isAvailable || inCart}
    >
      <ShoppingCart className="size-4" />
      {label}
    </Button>
  );
}

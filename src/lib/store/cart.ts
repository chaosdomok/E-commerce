'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartBook {
  id: string;
  title: string;
  author?: string | null;
  price: number;
  condition: string;
  course_code?: string | null;
  cover_url?: string | null;
  seller_id?: string | null;
}

export function getCartAddError(
  items: CartBook[],
  book: CartBook,
  currentUserId?: string | null,
) {
  if (currentUserId && book.seller_id === currentUserId) {
    return 'Nie możesz dodać do koszyka własnej książki.';
  }

  if (items.some((item) => item.id === book.id)) {
    return 'Ten podręcznik jest już w koszyku.';
  }

  if (items.length >= 15) {
    return 'Koszyk może zawierać maksymalnie 15 podręczników.';
  }

  const subject = book.course_code?.trim().toLocaleLowerCase('pl-PL');
  if (
    subject &&
    items.some(
      (item) =>
        item.course_code?.trim().toLocaleLowerCase('pl-PL') === subject,
    )
  ) {
    return 'Możesz wybrać maksymalnie jeden podręcznik z danego przedmiotu.';
  }

  return null;
}

interface CartState {
  items: CartBook[];
  addBook: (book: CartBook, currentUserId?: string | null) => void;
  removeBook: (bookId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addBook: (book, currentUserId) =>
        set((state) => {
          if (getCartAddError(state.items, book, currentUserId)) {
            return state;
          }

          return { items: [...state.items, book] };
        }),
      removeBook: (bookId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== bookId),
        })),
      clearCart: () => set({ items: [] }),
      getTotalPrice: () =>
        get().items.reduce((sum, item) => sum + Number(item.price || 0), 0),
    }),
    {
      name: 'sue-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

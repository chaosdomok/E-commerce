'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

interface CartState {
  items: Book[];
  addBook: (book: Book) => void;
  removeBook: (bookId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addBook: (book) =>
        set((state) => {
          if (state.items.some((item) => item.id === book.id)) {
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

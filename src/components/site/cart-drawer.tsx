'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Trash2, X, Book } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { reserveBooks } from '@/actions/reservations';
import { toast } from 'sonner';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeBook, clearCart, getTotalPrice } = useCartStore();
  const [isReserving, setIsReserving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const totalPrice = getTotalPrice();

  const handleReserve = async () => {
    if (items.length === 0) return;

    setIsReserving(true);
    setError(null);
    setMessage(null);

    const result = await reserveBooks(items.map((item) => item.id));

    if (result.success) {
      clearCart();
      toast.success(
        `Zarezerwowano! Zgłoś się do pokoju samorządu (sala 55) z odliczoną gotówką (${result.totalPrice.toFixed(2).replace('.00', '')} zł) do piątku.`
      );
      onOpenChange(false);
      return;
    }

    toast.error(result.error ?? 'Nie udało się zarezerwować książek.');
    setIsReserving(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex h-[100dvh] w-full">
      <button
        type="button"
        aria-label="Zamknij koszyk"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <aside className="relative z-[61] flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sue">
              Koszyk
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              Twoje rezerwacje
            </h2>
          </div>
          <button
            type="button"
            aria-label="Zamknij"
            className="rounded-full border border-zinc-800 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {message ? (
          <Alert className="mt-6 border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            <AlertTitle className="text-emerald-200">Rezerwacja zakończona</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Błąd rezerwacji</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 px-6 text-center">
              <ShoppingCart className="h-10 w-10 text-zinc-600" />
              <p className="mt-4 text-lg font-semibold text-zinc-200">
                Koszyk jest pusty
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Dodaj podręczniki, aby zarezerwować je na odbiór.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Book Thumbnail */}
                    <div className="relative h-16 w-12 sm:h-20 sm:w-16 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
                      {item.cover_url ? (
                        <Image
                          src={item.cover_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Book className="h-6 w-6 text-zinc-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white line-clamp-2">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.course_code ?? 'Brak przedmiotu'} • {item.price} zł
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Usuń ${item.title}`}
                      className="min-h-[44px] min-w-[44px] rounded-full p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white flex-shrink-0"
                      onClick={() => removeBook(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-4">
          <div className="mb-4 flex items-center justify-between text-sm text-zinc-400">
            <span>Razem</span>
            <span className="font-semibold text-white">{totalPrice.toFixed(2).replace('.00', '')} zł</span>
          </div>
          <Button
            className="w-full bg-sue text-white hover:bg-sue-deep"
            onClick={handleReserve}
            disabled={isReserving || items.length === 0}
          >
            {isReserving ? 'Rezerwuję…' : 'Zarezerwuj'}
          </Button>
        </div>
      </aside>
    </div>
  );
}

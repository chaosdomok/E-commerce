'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, ShoppingCart, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookCover, formatPrice } from '@/components/site/book-card';
import { reserveBooks } from '@/lib/frontend/reservations';
import { formatReservationExpiry } from '@/lib/frontend/reservation-display';
import { toast } from 'sonner';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReservationConfirmation {
  reservationCode: string;
  books: Array<{ bookId: string; title: string }>;
  reservedUntil: string;
  totalPrice: number;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter();
  const { items, removeBook, getTotalPrice } = useCartStore();
  const reserveRequestInFlight = useRef(false);
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<ReservationConfirmation | null>(null);

  const totalPrice = getTotalPrice();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isReserving) return;
    if (!nextOpen) {
      setError(null);
      setConfirmation(null);
    }
    onOpenChange(nextOpen);
  };

  const handleReserve = async () => {
    if (items.length === 0 || reserveRequestInFlight.current) return;

    reserveRequestInFlight.current = true;
    setIsReserving(true);
    setError(null);
    const submittedItems = [...items];

    try {
      const result = await reserveBooks(
        submittedItems.map((item) => item.id),
      );

      if (!result.success) {
        const message = result.error ?? 'Nie udało się zarezerwować książek.';
        setError(message);
        toast.error('Rezerwacja nie została zapisana', {
          description: message,
        });
        return;
      }

      setConfirmation({
        reservationCode: result.reservation.reservationCode,
        books: result.reservation.books,
        reservedUntil: result.reservedUntil,
        totalPrice: result.totalPrice,
      });
      for (const item of submittedItems) removeBook(item.id);
      toast.success('Wybrane podręczniki zostały zarezerwowane', {
        description: `Kod: ${result.reservation.reservationCode} · Ważna do ${formatReservationExpiry(result.reservedUntil)}`,
      });
      router.refresh();
    } catch {
      const message = 'Nie udało się połączyć. Spróbuj ponownie.';
      setError(message);
      toast.error('Rezerwacja nie została zapisana', {
        description: message,
      });
    } finally {
      reserveRequestInFlight.current = false;
      setIsReserving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Koszyk podręczników"
      className="inset-y-0 left-auto right-0 m-0 ml-auto h-[100dvh] max-h-[100dvh] w-full max-w-md rounded-none border-y-0 border-r-0 [&>div]:flex [&>div]:h-full [&>div]:flex-col"
    >
      <DialogHeader>
        <DialogTitle>Koszyk</DialogTitle>
        <DialogDescription>
          {confirmation
            ? 'Rezerwacja została zapisana.'
            : `${items.length} ${items.length === 1 ? 'wybrany podręcznik' : 'wybrane podręczniki'}`}
        </DialogDescription>
      </DialogHeader>

      {confirmation ? (
        <DialogContent className="flex flex-1 flex-col justify-center">
          <div className="rounded-2xl border border-green-border bg-green-soft p-5">
            <CheckCircle2 className="size-7 text-green-ink" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Rezerwacja potwierdzona
            </h3>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-ink">
              Kod rezerwacji
            </p>
            <p className="mt-1 break-all font-mono text-2xl font-bold tracking-[0.08em] text-foreground">
              {confirmation.reservationCode}
            </p>
            <div className="mt-5 border-t border-green-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-ink">
                Książki
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                {confirmation.books.map((book) => (
                  <li key={book.bookId} className="break-words">
                    {book.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex gap-3 border-t border-green-border pt-4">
              <Clock className="mt-0.5 size-4 shrink-0 text-green-ink" />
              <div>
                <p className="text-xs text-muted-foreground">Ważna do</p>
                <p className="font-semibold text-foreground">
                  {formatReservationExpiry(confirmation.reservedUntil)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-green-border pt-4">
              <span className="text-sm text-muted-foreground">Do zapłaty</span>
              <strong className="text-lg text-foreground">
                {formatPrice(confirmation.totalPrice)}
              </strong>
            </div>
          </div>
        </DialogContent>
      ) : (
        <DialogContent className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-soft px-6 text-center">
              <ShoppingCart className="size-9 text-muted-foreground" />
              <p className="mt-4 font-semibold text-foreground">
                Koszyk jest pusty
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Dodaj podręczniki z katalogu, aby zarezerwować je razem.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-surface-soft p-3"
                >
                  <div className="flex items-start gap-3">
                    <BookCover
                      title={item.title}
                      subject={item.course_code}
                      url={item.cover_url}
                      className="h-20 w-16 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.course_code ?? 'Podręcznik'}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Usuń ${item.title} z koszyka`}
                      className="icon-button shrink-0"
                      onClick={() => removeBook(item.id)}
                      disabled={isReserving}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
        </DialogContent>
      )}

      <DialogFooter className="mt-auto border-t border-border pt-4">
        {confirmation ? (
          <Button className="w-full" onClick={() => handleOpenChange(false)}>
            Zamknij
          </Button>
        ) : (
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Razem</span>
              <strong className="text-lg text-foreground">
                {formatPrice(totalPrice)}
              </strong>
            </div>
            <Button
              variant="reserve"
              className="w-full"
              onClick={handleReserve}
              disabled={isReserving || items.length === 0}
            >
              {isReserving ? 'Rezerwowanie…' : 'Zarezerwuj wybrane'}
            </Button>
          </div>
        )}
      </DialogFooter>
    </Dialog>
  );
}

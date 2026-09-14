'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { reserveBooks } from '@/lib/frontend/reservations';
import { toast } from 'sonner';
import { ReservationDialog } from '@/components/site/reservation-dialog';
import { formatReservationExpiry } from '@/lib/frontend/reservation-display';

interface SingleBookReserveButtonProps {
  author?: string;
  coverUrl?: string | null;
  bookId: string;
  bookTitle: string;
  price: number;
  isLoggedIn: boolean;
}

export function SingleBookReserveButton({
  author,
  coverUrl,
  bookId,
  bookTitle,
  price,
  isLoggedIn,
}: SingleBookReserveButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    setReservationError(null);
    setShowModal(true);
  };

  const handleConfirm = () => {
    setReservationError(null);
    startTransition(async () => {
      try {
        const res = await reserveBooks([bookId]);
        if (res.success) {
          const reservationCode = res.reservation.reservationCode;
          toast.success('Podręcznik został zarezerwowany', {
            description: `${reservationCode ? `Kod: ${reservationCode} · ` : ''}Ważna do ${formatReservationExpiry(res.reservedUntil)}`,
          });
          setShowModal(false);
          router.push('/profile');
        } else {
          setReservationError(res.error || 'Nie udało się zarezerwować.');
          toast.error('Rezerwacja nie została zapisana', {
            description: res.error || 'Nie udało się zarezerwować.',
          });
        }
      } catch {
        setReservationError('Nie udało się połączyć. Spróbuj ponownie.');
      }
    });
  };

  return (
    <>
      <Button variant="reserve" onClick={handleOpen} className="h-12 w-full">
        Zarezerwuj podręcznik
      </Button>
      <ReservationDialog
        book={
          showModal
            ? { title: bookTitle, author, cover_url: coverUrl, price }
            : null
        }
        pending={isPending}
        error={reservationError}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

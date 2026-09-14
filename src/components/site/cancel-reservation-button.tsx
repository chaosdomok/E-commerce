'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cancelOwnReservation } from '@/lib/frontend/reservations';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';

export function CancelReservationButton({
  reservationId,
  bookCount,
}: {
  reservationId: string;
  bookCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleCancel = async () => {
    const result = await cancelOwnReservation(reservationId);
    if (!result.success) {
      toast.error('Nie udało się anulować rezerwacji', {
        description: result.error,
      });
      return false;
    }

    toast.success(result.message);
    router.refresh();
    return true;
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full"
        onClick={() => setOpen(true)}
      >
        <XCircle className="size-4" />
        Anuluj rezerwację
      </Button>

      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Anulować rezerwację?"
        description={`Czy na pewno chcesz anulować tę rezerwację? ${bookCount === 1 ? 'Książka wróci' : 'Książki wrócą'} do katalogu.`}
        confirmLabel="Anuluj rezerwację"
        loadingLabel="Anulowanie…"
        onConfirm={handleCancel}
      />
    </>
  );
}

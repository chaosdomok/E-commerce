'use client';
import { Clock, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookCover, formatPrice } from '@/components/site/book-card';
import { siteConfig } from '@/lib/site-config';
export function ReservationDialog({
  book,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  book: {
    title: string;
    author?: string | null;
    cover_url?: string | null;
    price: number;
  } | null;
  pending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={!!book}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Zarezerwować ten podręcznik?"
    >
      {book && (
        <>
          <DialogHeader>
            <DialogTitle>Zarezerwować ten podręcznik?</DialogTitle>
            <DialogDescription>
              Sprawdź szczegóły przed potwierdzeniem.
            </DialogDescription>
          </DialogHeader>
          <DialogContent>
            <div className="flex gap-4 border-b border-border pb-5">
              <BookCover
                title={book.title}
                url={book.cover_url}
                className="h-28 w-24 shrink-0 rounded-lg"
              />
              <div className="min-w-0 py-1">
                <h3 className="text-base font-semibold">{book.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {book.author || 'Podręcznik szkolny'}
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {formatPrice(book.price)}
                </p>
              </div>
            </div>
            <dl className="space-y-4 py-5 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sue" />
                <div>
                  <dt className="font-medium">{siteConfig.pickup}</dt>
                  <dd className="mt-1 text-muted-foreground">
                    Płatność gotówką lub BLIK na numer wskazany na stanowisku
                    sprzedaży.
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-sue" />
                <div>
                  <dt className="font-medium">
                    Termin odbioru rezerwacji
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    Dokładną datę zobaczysz po potwierdzeniu. Po upływie terminu
                    książka wraca do katalogu.
                  </dd>
                </div>
              </div>
            </dl>
            <p className="rounded-lg bg-sue-soft px-4 py-3 text-sm text-primary">
              Po potwierdzeniu kod i dokładny termin odbioru znajdziesz w swoim
              profilu.
            </p>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger"
              >
                {error}
              </p>
            )}
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={onClose}>
              Anuluj
            </Button>
            <Button variant="reserve" disabled={pending} onClick={onConfirm}>
              {pending ? 'Rezerwowanie…' : 'Potwierdź rezerwację'}
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}

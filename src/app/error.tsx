'use client';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-container py-20 text-center">
      <AlertCircle className="mx-auto size-10 text-danger" />
      <h1 className="page-heading mt-5">Nie udało się otworzyć strony.</h1>
      <p className="mt-3 text-muted-foreground">Spróbuj jeszcze raz za chwilę.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Spróbuj ponownie</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Odśwież stronę
        </Button>
        <Link href="/" className="secondary-link">
          Strona główna
        </Link>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="page-container flex-1 py-20 text-center">
        <BookOpen className="mx-auto size-10 text-sue" />
        <p className="eyebrow mt-6">404 · Nie znaleziono</p>
        <h1 className="page-heading mt-3">Ta strona jest niedostępna.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Link może być nieaktualny. Sprawdź katalog, aby znaleźć dostępne
          podręczniki.
        </p>
        <Link href="/katalog" className="primary-link mt-7">
          Przejdź do katalogu
        </Link>
      </main>
      <Footer />
    </div>
  );
}

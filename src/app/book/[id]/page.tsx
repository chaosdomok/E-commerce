import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-sue transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót do katalogu
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white mb-4">
            Szczegóły podręcznika
          </h1>
          <p className="text-zinc-400 text-lg mb-8">
            ID: <span className="font-mono text-sue">{id}</span>
          </p>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
            <p className="text-zinc-500">
              Strona szczegółów podręcznika jest w trakcie tworzenia.
            </p>
            <p className="text-zinc-600 text-sm mt-2">
              Tutaj zostaną wyświetlone pełne informacje o podręczniku.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

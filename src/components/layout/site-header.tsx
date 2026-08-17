import Link from "next/link";
import { BookOpen } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900 text-orange-300">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>{" "}
          Podręcznikowo
        </Link>

        <nav className="hidden items-center gap-6 text-sm uppercase tracking-[0.25em] text-zinc-400 sm:flex" aria-label="Główna nawigacja">
          <Link href="/#katalog" className="transition-colors hover:text-[#FF7B54]">
            Katalog
          </Link>
          <Link href="/#jak-to-dziala" className="transition-colors hover:text-[#FF7B54]">
            Jak to działa
          </Link>
        </nav>

        <Link
          href="/#katalog"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#FF7B54] px-4 text-sm font-semibold text-zinc-950 shadow-[0_0_15px_rgba(255,123,84,0.4)] transition hover:bg-[#FF7B54]/90"
        >
          Zobacz książki
        </Link>
      </div>
    </header>
  );
}

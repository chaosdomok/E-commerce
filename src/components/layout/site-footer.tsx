import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Podręcznikowo</p>
        <Link href="/#jak-to-dziala" className="transition-colors hover:text-[#FF7B54]">
          Jak działa kiermasz
        </Link>
      </div>
    </footer>
  );
}

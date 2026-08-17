'use client';

import { Mail, Globe, ExternalLink } from 'lucide-react';

const links = {
  Platforma: ['Przeglądaj książki', 'Dodaj książkę', 'Jak to działa', 'Cennik'],
  Społeczność: ['Centrum studenta', 'Reputacja', 'Bezpieczeństwo', 'Zasady'],
  Firma: ['O nas', 'Blog', 'Kariera', 'Kontakt'],
};

export function Footer() {
  return (
    <footer className="relative border-t border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2">
            <a href="#" className="flex items-center gap-2">
              <div className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full bg-sue/10 ring-1 ring-sue/30">
                <img src="/logo.svg" alt="SUE Logo" className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                SUE
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              Giełda podręczników bez prowizji, stworzona dla studentów, którzy myślą
              inaczej.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Mail, Globe, ExternalLink].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition hover:border-sue/40 hover:text-sue"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {group}
              </h4>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-zinc-500 transition hover:text-sue"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 sm:flex-row">
          <p className="text-xs text-zinc-600 text-center sm:text-left">
            © {new Date().getFullYear()} SUE Exchange. Zbudowane przez studentów, dla
            studentów.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-600">
            <a href="#" className="transition hover:text-zinc-400">
              Prywatność
            </a>
            <a href="#" className="transition hover:text-zinc-400">
              Regulamin
            </a>
            <a href="#" className="transition hover:text-zinc-400">
              Ciasteczka
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

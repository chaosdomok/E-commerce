'use client';

import { ListPlus, ShieldCheck, Repeat } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Dodaj swoje książki',
    desc: 'Zrób zdjęcie okładki, ustal cenę i opublikuj w mniej niż 60 sekund. Automatyczne uzupełnianie ISBN zajmie się nudnymi metadanymi.',
    icon: ListPlus,
  },
  {
    num: '02',
    title: 'Dopasuj i zweryfikuj',
    desc: 'Nasza sieć rówieśników weryfikuje stan i tożsamość. Każda wymiana jest poparta oceną reputacji studenta.',
    icon: ShieldCheck,
  },
  {
    num: '03',
    title: 'Wymień lub wypłać',
    desc: 'Wymień osobiście, wyślij bezpośrednio lub wypłać do portfela. Zero prowizji, zawsze.',
    icon: Repeat,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-16 sm:py-20 lg:py-28 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl sm:mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sue">
            Jak to działa
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Trzy kroki do sprawiedliwszej gospodarki książkowej.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Bez opłat płatniczych, bez dorabiania platformy. SUE zostawia wymianę między
            tobą a drugim studentem.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.num}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-7 backdrop-blur-md transition-all duration-300 hover:border-sue/30 hover:bg-zinc-900/70 hover:glow-accent-sm"
            >
              <div className="absolute -right-2 -top-3 font-display text-5xl font-bold text-zinc-800/80 transition-colors duration-300 group-hover:text-sue/30 sm:text-6xl lg:text-7xl">
                {s.num}
              </div>
              <div className="relative">
                <span className="mb-4 sm:mb-5 inline-flex min-h-[44px] min-w-[44px] h-11 w-11 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-sue transition group-hover:border-sue/40">
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <h3 className="font-display text-lg font-semibold text-white sm:text-xl">
                  {s.title}
                </h3>
                <p className="mt-2 sm:mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

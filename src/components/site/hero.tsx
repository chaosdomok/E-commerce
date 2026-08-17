'use client';

import { ArrowRight, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react';

const stats = [
  { label: 'Wymienione książki', value: '1 200+', icon: Users },
  { label: 'Prowizja', value: '0%', icon: Wallet },
  { label: 'AktywniT studenci', value: '8 400', icon: TrendingUp },
  { label: 'Śr. oszczędność', value: '340 $', icon: Sparkles },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden w-full max-w-full pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-28">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      {/* Glowing orb */}
      <div className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-sue/10 blur-[120px] sm:h-[420px] sm:w-[620px] sm:top-24" />
      <div className="pointer-events-none absolute right-1/4 top-32 -z-10 h-[200px] w-[200px] rounded-full bg-sue/5 blur-[100px] sm:h-[280px] sm:w-[280px] sm:top-40" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[10px] sm:px-4 sm:text-xs font-medium text-zinc-300 backdrop-blur-md animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sue opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sue" />
            </span>
            Aktywna sieć · 12 książek dodanych w ostatniej godzinie
          </div>

          {/* Headline */}
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl animate-fade-up">
            Wymieniaj podręczniki,
            <br />
            <span className="text-sue text-glow">zostaw pieniądze u siebie.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:mt-6 sm:text-base lg:text-lg animate-fade-up [animation-delay:120ms] opacity-0">
            SUE to giełda bez prowizji, gdzie studenci wymieniają, sprzedają i
            odkrywają książki bezpośrednio. Bez pośredników. Bez opłat. Po prostu
            mądrzejszy sposób na zdobycie potrzebnych książek.
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row animate-fade-up [animation-delay:240ms] opacity-0">
            <a
              href="#catalog"
              className="group inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-sue px-6 text-sm font-semibold text-white transition-all duration-300 hover:bg-sue-deep hover:glow-accent sm:px-7"
            >
              Przeglądaj podręczniki
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#how"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/40 px-6 text-sm font-semibold text-zinc-200 backdrop-blur-md transition hover:border-zinc-700 hover:bg-zinc-900 sm:px-7"
            >
              Jak to działa
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:mt-16 sm:gap-4 sm:grid-cols-4 animate-fade-up [animation-delay:360ms] opacity-0">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-md transition-all duration-300 hover:border-sue/30 hover:bg-zinc-900/70 sm:p-5"
            >
              <s.icon className="mx-auto mb-2 h-5 w-5 text-sue/70 transition group-hover:text-sue" />
              <div className="font-display text-xl font-bold text-white sm:text-2xl lg:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

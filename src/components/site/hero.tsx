import { EventIllustration } from '@/components/site/event-illustration';
import Link from 'next/link';
import { ArrowRight, Recycle } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
export function Hero() {
  return (
    <section className="event-hero relative border-b border-border bg-background">
      <div className="page-container relative grid items-center gap-8 py-12 sm:py-16 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow inline-flex rounded-full border border-green-border bg-green-soft px-3 py-1.5 text-green-ink">
            Targi Książek · {siteConfig.year}
          </p>
          <h1 className="mt-5 font-display text-[36px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-[48px]">
            Daj podręcznikom
            <br />
            <span className="text-green">drugie życie.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Sprzedaj książki, których już nie potrzebujesz, i znajdź podręczniki
            na kolejny rok szkolny.
          </p>
          <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
            <Link href="/katalog" className="primary-link">
              Przeglądaj katalog
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/dodaj-ksiazke" className="secondary-link">
              Wystaw podręcznik
            </Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-subtle">
            <Recycle className="size-4 text-warm" />
            Mniej nowych rzeczy. Więcej dobrych historii.
          </p>
        </div>
        <div className="hero-art-wrap relative mx-auto flex h-[160px] w-[220px] max-w-[410px] items-center justify-center md:h-[310px] md:w-full">
          <EventIllustration />
        </div>
      </div>
    </section>
  );
}

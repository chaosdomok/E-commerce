import { ListPlus, HandHeart, BookOpen, Wallet } from 'lucide-react';
const steps = [
  {
    title: 'Wystaw podręcznik',
    text: 'Dodaj jedną lub kilka książek. Podaj ich stan i swoją cenę.',
    Icon: ListPlus,
  },
  {
    title: 'Przekaż do weryfikacji',
    text: 'Przynieś książki do sali nr 13. Po akceptacji pojawią się w katalogu.',
    Icon: HandHeart,
  },
  {
    title: 'Ktoś ją rezerwuje',
    text: 'Kupujący wybiera podręcznik i odbiera go w punkcie kiermaszu.',
    Icon: BookOpen,
  },
  {
    title: 'Odbierz należność',
    text: 'Sprzedaż i należną kwotę sprawdzisz w profilu. Rozliczenie zgodnie z wybraną formą wypłaty.',
    Icon: Wallet,
  },
];
export function HowItWorks() {
  return (
    <section
      id="how"
      className="event-process-section page-container py-12 sm:py-14"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Od półki do półki</p>
          <h2 className="section-heading mt-2">Jak to działa?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Cały proces w czterech krokach.
        </p>
      </div>
      <ol className="event-process relative grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ title, text, Icon }, index) => (
          <li
            key={title}
            className="process-step relative grid grid-cols-[44px_1fr] gap-x-4 pt-5 lg:block"
          >
            <div className="row-span-2 flex flex-col-reverse items-center justify-end gap-2 lg:mb-4 lg:flex-row lg:justify-between">
              <span className="relative bg-surface font-mono text-xs text-subtle lg:pr-3">
                0{index + 1}
              </span>
              <span className={`process-icon process-icon-${index}`}>
                <Icon strokeWidth={1.5} className="size-[22px] text-current" />
              </span>
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="col-start-2 mt-2 text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

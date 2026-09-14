import type { ReactNode } from 'react';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';

export const metadata = {
  title: 'Polityka prywatności | Targi Książek 2026',
  description:
    'Informacje o przetwarzaniu danych podczas korzystania z platformy Targów Książek 2026.',
};

type PrivacySection = {
  title: string;
  content: ReactNode;
};

const sections: PrivacySection[] = [
  {
    title: 'Administrator danych',
    content: (
      <ol className="list-decimal space-y-4 pl-5 marker:font-medium marker:text-foreground sm:pl-6">
        <li className="pl-1.5">
          Administratorem danych osobowych przetwarzanych w związku z
          organizacją Targów Książek 2026 jest:
          <address className="mt-3 not-italic text-foreground">
            Zespół Szkół Elektrycznych im. Tadeusza Kościuszki w Opolu
            <br />
            ul. Tadeusza Kościuszki 39–41
            <br />
            45-062 Opole
          </address>
          <p className="mt-3">reprezentowany przez Dyrektora Szkoły.</p>
        </li>
        <li className="pl-1.5">
          W sprawach związanych z danymi przetwarzanymi w ramach platformy
          Targów Książek można skontaktować się również pod adresem:{' '}
          <a href="mailto:admin@postol.tech">admin@postol.tech</a>.
        </li>
        <li className="pl-1.5">
          Szkoła posiada Inspektora Ochrony Danych. Oficjalne dane kontaktowe
          Inspektora Ochrony Danych są dostępne w sekcji RODO na stronie
          internetowej Zespołu Szkół Elektrycznych w Opolu.
        </li>
        <li className="pl-1.5">
          POSTOL.TECH zapewnia rozwiązania techniczne wykorzystywane przez
          platformę Targów Książek. Dostęp do danych w celach technicznych
          posiadają wyłącznie osoby działające w zakresie niezbędnym do obsługi
          systemu i zgodnie z upoważnieniem Administratora.
        </li>
      </ol>
    ),
  },
  {
    title: 'Jakie dane przetwarzamy',
    content: (
      <>
        <p>
          W zależności od sposobu korzystania z platformy mogą być przetwarzane:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>imię i nazwisko,</li>
          <li>adres e-mail,</li>
          <li>numer telefonu,</li>
          <li>szkoła,</li>
          <li>klasa,</li>
          <li>dane związane z kontem użytkownika,</li>
          <li>informacje o wystawionych książkach,</li>
          <li>historia rezerwacji,</li>
          <li>informacje o sprzedaży i rozliczeniach,</li>
          <li>preferowany sposób wypłaty środków,</li>
          <li>
            numer telefonu wykorzystywany do rozliczenia, jeżeli użytkownik
            wybierze przelew na telefon,
          </li>
          <li>adres IP,</li>
          <li>
            dane techniczne i logi niezbędne do działania i zabezpieczenia
            platformy.
          </li>
        </ul>
        <p className="mt-5">
          Nie wymagamy podawania danych szczególnych kategorii, takich jak
          informacje o stanie zdrowia, poglądach politycznych, religii czy
          pochodzeniu.
        </p>
      </>
    ),
  },
  {
    title: 'W jakim celu wykorzystujemy dane',
    content: (
      <>
        <p>Dane są przetwarzane w zakresie niezbędnym do:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>utworzenia i obsługi konta użytkownika,</li>
          <li>przyjmowania zgłoszeń książek,</li>
          <li>obsługi katalogu,</li>
          <li>dokonywania i obsługi rezerwacji,</li>
          <li>
            kontaktowania się z użytkownikiem w sprawach dotyczących Targów,
          </li>
          <li>rozliczania sprzedanych książek,</li>
          <li>
            informowania o książkach niesprzedanych i terminach ich odbioru,
          </li>
          <li>obsługi reklamacji i zgłoszeń,</li>
          <li>zapewnienia bezpieczeństwa platformy,</li>
          <li>zapobiegania nadużyciom,</li>
          <li>diagnozowania błędów technicznych.</li>
        </ul>
        <p className="mt-5">
          Dane są przetwarzane w związku z dobrowolnym korzystaniem z platformy
          oraz realizacją zasad Targów Książek. Zakres i podstawy przetwarzania
          wynikają z charakteru świadczonych usług oraz obowiązków
          Administratora.
        </p>
        <p className="mt-4">
          Nie wykorzystujemy danych użytkowników Targów Książek do sprzedaży
          danych, profilowania reklamowego ani prowadzenia zewnętrznych kampanii
          marketingowych.
        </p>
      </>
    ),
  },
  {
    title: 'Komu dane mogą być udostępniane',
    content: (
      <>
        <p>
          Dostęp do danych mogą posiadać wyłącznie osoby i podmioty, dla których
          jest to niezbędne do przeprowadzenia Targów lub zapewnienia działania
          platformy.
        </p>
        <p className="mt-4">Mogą to być w szczególności:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>
            upoważnione osoby działające w ramach Zespołu Szkół Elektrycznych,
          </li>
          <li>upoważnieni członkowie zespołu organizującego Targi,</li>
          <li>osoby zapewniające techniczne utrzymanie platformy,</li>
          <li>
            dostawcy infrastruktury informatycznej wykorzystywanej przez Serwis,
          </li>
          <li>
            podmioty, którym Administrator jest zobowiązany przekazać dane na
            podstawie przepisów prawa.
          </li>
        </ul>
        <p className="mt-5">Dane nie są sprzedawane innym podmiotom.</p>
      </>
    ),
  },
  {
    title: 'Jak długo przechowujemy dane',
    content: (
      <>
        <p>
          Dane związane z kontem, wystawianiem książek, rezerwacjami i
          rozliczeniami są przechowywane przez okres potrzebny do:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>przeprowadzenia Targów,</li>
          <li>zakończenia sprzedaży,</li>
          <li>wypłaty należnych środków,</li>
          <li>odbioru niesprzedanych książek,</li>
          <li>zakończenia reklamacji i ewentualnych spraw spornych.</li>
        </ul>
        <p className="mt-5">
          Po zakończeniu tych czynności dane, które nie są już potrzebne, mogą
          zostać usunięte lub zanonimizowane.
        </p>
        <p className="mt-4">
          Dane mogą być przechowywane dłużej, jeżeli obowiązek taki wynika z
          przepisów prawa albo jest to niezbędne do ustalenia, dochodzenia lub
          obrony roszczeń.
        </p>
        <p className="mt-4">
          Logi techniczne i dane dotyczące bezpieczeństwa są przechowywane przez
          okres niezbędny do zapewnienia bezpieczeństwa, diagnostyki błędów i
          ochrony platformy.
        </p>
      </>
    ),
  },
  {
    title: 'Twoje prawa',
    content: (
      <>
        <p>W zakresie przewidzianym przepisami możesz zwrócić się o:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>dostęp do swoich danych,</li>
          <li>poprawienie nieprawidłowych danych,</li>
          <li>usunięcie danych,</li>
          <li>ograniczenie przetwarzania,</li>
          <li>otrzymanie informacji o sposobie przetwarzania danych,</li>
          <li>
            realizację innych praw wynikających z obowiązujących przepisów o
            ochronie danych osobowych.
          </li>
        </ul>
        <p className="mt-5">
          Wniosek dotyczący danych przetwarzanych poprzez platformę można
          przesłać na: <a href="mailto:admin@postol.tech">admin@postol.tech</a>.
        </p>
        <p className="mt-4">
          Usunięcie konta nie zawsze oznacza natychmiastowe usunięcie wszystkich
          danych.
        </p>
        <p className="mt-4">Jeżeli użytkownik posiada:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>aktywne rezerwacje,</li>
          <li>wystawione książki,</li>
          <li>książki oczekujące na odbiór,</li>
          <li>nierozliczone środki,</li>
          <li>trwającą reklamację,</li>
        </ul>
        <p className="mt-5">
          część danych może być przechowywana do czasu zakończenia tych spraw.
        </p>
        <p className="mt-4">
          Użytkownik ma również prawo wniesienia skargi do Prezesa Urzędu
          Ochrony Danych Osobowych, jeżeli uważa, że jego dane są przetwarzane
          niezgodnie z przepisami.
        </p>
      </>
    ),
  },
  {
    title: 'Dane techniczne i pliki cookies',
    content: (
      <>
        <p>
          Platforma może wykorzystywać pliki cookies oraz podobne mechanizmy
          techniczne niezbędne do:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-green-ink sm:pl-6">
          <li>utrzymania sesji użytkownika,</li>
          <li>logowania,</li>
          <li>zapewnienia bezpieczeństwa,</li>
          <li>prawidłowego działania podstawowych funkcji Serwisu.</li>
        </ul>
        <p className="mt-5">
          Serwis nie wykorzystuje reklamowych plików cookies ani mechanizmów
          śledzących użytkowników w celach marketingowych.
        </p>
      </>
    ),
  },
  {
    title: 'Kontakt',
    content: (
      <>
        <p>
          W sprawach dotyczących działania platformy i danych przetwarzanych za
          jej pomocą: <a href="mailto:admin@postol.tech">admin@postol.tech</a>
        </p>
        <p className="mt-4">
          W sprawach organizacyjnych dotyczących Targów Książek:{' '}
          <a href="mailto:targi.pomoc@postol.tech">targi.pomoc@postol.tech</a>
        </p>
        <p className="mt-4">Administrator danych:</p>
        <address className="mt-2 not-italic text-foreground">
          Zespół Szkół Elektrycznych im. Tadeusza Kościuszki w Opolu
          <br />
          ul. Tadeusza Kościuszki 39–41
          <br />
          45-062 Opole
        </address>
        <p className="mt-4">
          Oficjalne informacje dotyczące ochrony danych oraz kontaktu do
          Inspektora Ochrony Danych znajdują się na stronie internetowej szkoły
          w sekcji RODO.
        </p>
      </>
    ),
  },
];

export default function PolitykaPrywatnosciPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="page-container flex-1 py-10 sm:py-14 lg:py-16">
        <header className="max-w-4xl">
          <h1 className="page-heading">Polityka prywatności</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Poniżej wyjaśniamy, jakie dane są przetwarzane podczas korzystania z
            platformy Targów Książek 2026 i w jakim celu.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-7 sm:mt-10 lg:grid-cols-[minmax(0,820px)_minmax(220px,1fr)] lg:gap-10">
          <nav
            aria-label="Spis treści polityki prywatności"
            className="order-1 rounded-2xl border border-border bg-surface-soft p-5 lg:sticky lg:top-24 lg:order-2"
          >
            <h2 className="font-display text-base font-semibold">
              Spis treści
            </h2>
            <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    href={`#sekcja-${index + 1}`}
                    className="group flex min-h-10 items-start gap-2.5 rounded-lg px-2 py-2 text-sm leading-snug text-muted-foreground hover:bg-green-soft hover:text-foreground"
                  >
                    <span className="shrink-0 font-mono text-xs font-semibold text-green-ink">
                      {index + 1}.
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal-content order-2 min-w-0 rounded-2xl border border-border bg-surface px-5 py-2 shadow-sm sm:px-8 lg:order-1">
            {sections.map((section, index) => (
              <section key={section.title} id={`sekcja-${index + 1}`}>
                <h2 className="flex items-baseline gap-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  <span className="shrink-0 text-green-ink">§{index + 1}.</span>
                  <span>{section.title}</span>
                </h2>
                <div className="mt-5 text-base leading-[1.8] text-muted-foreground">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}

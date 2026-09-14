import type { ReactNode } from 'react';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';

export const metadata = {
  title: 'Regulamin Targów Książek 2026 | SUE',
  description:
    'Najważniejsze zasady wystawiania, rezerwowania, sprzedaży i odbioru książek podczas Targów Książek 2026.',
};

type RegulationItem = {
  content: ReactNode;
  subitems?: ReactNode[];
};

type RegulationSection = {
  title: string;
  items: RegulationItem[];
};

const sections: RegulationSection[] = [
  {
    title: 'Informacje ogólne',
    items: [
      {
        content:
          'Organizatorem Targów Książek 2026 jest Zespół Szkół Elektrycznych im. Tadeusza Kościuszki w Opolu, działający poprzez Samorząd Uczniowski, za zgodą Dyrektora Szkoły.',
      },
      {
        content:
          'Targi odbywają się w Zespole Szkół Elektrycznych przy ul. Tadeusza Kościuszki 39–41, 45-062 Opole.',
      },
      {
        content:
          'Jedynym punktem przyjmowania, sprzedaży i wydawania książek jest sala nr 13.',
      },
      {
        content: 'Harmonogram wydarzenia:',
        subitems: [
          '15–16 września 2026 r. – przyjmowanie książek do sprzedaży,',
          '17–18 września 2026 r. – sprzedaż książek,',
          '21 września 2026 r. – możliwy dodatkowy dzień sprzedaży, jeżeli Organizator poinformuje o jego uruchomieniu.',
        ],
      },
      { content: 'Punkt Targów działa w godzinach 10:25–12:25.' },
      {
        content: 'Kontakt z Organizatorem:',
        subitems: [
          <span key="email">
            e-mail:{' '}
            <a href="mailto:targi.pomoc@postol.tech">targi.pomoc@postol.tech</a>
            {','}
          </span>,
          <span key="phone">
            infolinia: <a href="tel:+48776888416">+48 776 888 416</a>.
          </span>,
        ],
      },
      {
        content: 'Infolinia działa w dniach Targów w godzinach 8:00–15:00.',
      },
      {
        content: (
          <>
            Serwis internetowy Targów działa pod adresem{' '}
            <a href="https://targi.postol.tech">targi.postol.tech</a>.
          </>
        ),
      },
      {
        content:
          'POSTOL.TECH zapewnia obsługę techniczną Serwisu i infolinii. Nie jest organizatorem Targów, sprzedawcą książek ani stroną transakcji pomiędzy uczestnikami.',
      },
    ],
  },
  {
    title: 'Konto i uczestnictwo',
    items: [
      {
        content:
          'Z Targów mogą korzystać uczniowie oraz inne osoby, z zastrzeżeniem zasad obowiązujących na terenie szkoły.',
      },
      {
        content: 'Konto w Serwisie może założyć osoba, która ukończyła 13 lat.',
      },
      {
        content:
          'Osoba niepełnoletnia korzystająca z Serwisu potwierdza, że posiada zgodę rodzica lub opiekuna prawnego na udział w Targach.',
      },
      {
        content:
          'Założenie konta wymaga zaakceptowania niniejszego Regulaminu.',
      },
      { content: 'Użytkownik ma obowiązek podawać prawdziwe i aktualne dane.' },
      { content: 'Jedna osoba może posiadać jedno konto.' },
      {
        content:
          'Zabronione jest wykorzystywanie Serwisu do spamu, fałszywych zgłoszeń, obchodzenia limitów, celowego blokowania książek lub innych działań utrudniających korzystanie z Targów.',
      },
      {
        content:
          'Organizator może usunąć zgłoszenie, anulować rezerwację albo czasowo lub trwale zablokować konto naruszające te zasady.',
      },
    ],
  },
  {
    title: 'Wystawianie i przyjmowanie książek',
    items: [
      {
        content: 'Do sprzedaży można zgłaszać m.in.:',
        subitems: [
          'podręczniki,',
          'repetytoria,',
          'zbiory zadań,',
          'nieuzupełnione ćwiczenia i materiały edukacyjne.',
        ],
      },
      {
        content:
          'Książka posiadająca wykorzystany jednorazowy kod dostępu może zostać przyjęta, jeżeli jej stan nadal pozwala na normalne korzystanie z książki.',
      },
      {
        content: 'Nie są przyjmowane w szczególności książki:',
        subitems: [
          'mocno uszkodzone,',
          'niekompletne,',
          'w znacznym stopniu uzupełnione,',
          'nienadające się do dalszego użytkowania.',
        ],
      },
      {
        content:
          'Zgłaszający sam określa stan książki. Stan ten jest następnie weryfikowany podczas fizycznego przyjęcia książki.',
      },
      {
        content:
          'Organizator może zaakceptować książkę, zmienić oznaczenie jej stanu albo odmówić jej przyjęcia, jeżeli nie spełnia zasad Targów. Nie wymaga to sporządzania szczegółowego pisemnego uzasadnienia.',
      },
      {
        content:
          'Jeżeli po przyjęciu zostanie ujawniona istotna, wcześniej nieujawniona wada, książka może zostać wycofana ze sprzedaży i przeznaczona do odbioru przez Wystawiającego.',
      },
      {
        content:
          'Wystawiając książkę Użytkownik potwierdza, że jest jej właścicielem albo posiada prawo do jej sprzedaży oraz że podane przez niego informacje są zgodne z prawdą.',
      },
      {
        content:
          'Po fizycznym przyjęciu i zaakceptowaniu książki nie można jej samodzielnie wycofać przed zakończeniem Targów.',
      },
    ],
  },
  {
    title: 'Cena i sprzedaż',
    items: [
      {
        content:
          'Wystawiający sam określa kwotę, którą chce otrzymać za książkę.',
      },
      {
        content:
          'W przypadku sprzedaży książki Wystawiający otrzymuje pełną wskazaną przez siebie kwotę.',
      },
      {
        content:
          'Cena prezentowana kupującym w katalogu może być wyższa od kwoty wskazanej przez Wystawiającego i uwzględniać opłatę organizacyjną Targów.',
      },
      {
        content:
          'Środki pochodzące z opłaty organizacyjnej przeznaczane są na pokrycie kosztów organizacji Targów oraz działalność Samorządu Uczniowskiego.',
      },
      {
        content:
          'Kupujący zawsze widzi w katalogu pełną cenę, którą zapłaci za książkę.',
      },
      {
        content:
          'Przed dokonaniem zakupu Kupujący może obejrzeć książkę i zrezygnować z jej zakupu.',
      },
      {
        content: 'Płatność odbywa się:',
        subitems: [
          'gotówką albo',
          'poprzez BLIK na numer wskazany przez Organizatora na stanowisku sprzedaży.',
        ],
      },
      {
        content:
          'Zaleca się przygotowanie możliwie dokładnej kwoty. Wydawanie reszty zależy od dostępności gotówki na stanowisku.',
      },
      {
        content:
          'Po zapłacie i wydaniu książki nie przewiduje się zwrotu wyłącznie z powodu zmiany decyzji Kupującego.',
      },
      {
        content:
          'W przypadku ujawnienia istotnej, wcześniej nieujawnionej wady sprawę rozpatruje ścisły zarząd Samorządu Uczniowskiego. W sprawach spornych decyzja może zostać przekazana Dyrekcji Szkoły. Postanowienie to nie ogranicza praw, których nie można wyłączyć na podstawie obowiązujących przepisów.',
      },
    ],
  },
  {
    title: 'Rezerwacje',
    items: [
      { content: 'Rezerwacji książki może dokonać zalogowany Użytkownik.' },
      {
        content:
          'Rezerwacja obowiązuje do godziny 12:25 następnego dnia sprzedażowego.',
      },
      {
        content:
          'Jeżeli następny dzień nie jest dniem sprzedaży, rezerwacja pozostaje aktywna do godziny 12:25 najbliższego kolejnego dnia sprzedażowego.',
      },
      {
        content:
          'Po upływie czasu rezerwacja wygasa automatycznie, a książka wraca do katalogu. Użytkownik może otrzymać powiadomienie o jej wygaśnięciu.',
      },
      {
        content:
          'Jeden Użytkownik może posiadać maksymalnie 15 aktywnych rezerwacji, przy czym może zarezerwować maksymalnie jedną książkę z danego działu/przedmiotu.',
      },
      { content: 'Użytkownik może anulować rezerwację przed jej realizacją.' },
      {
        content:
          'Organizator może anulować rezerwację w przypadku błędu, niedostępności książki, naruszenia Regulaminu albo podejrzenia celowego blokowania egzemplarzy.',
      },
      {
        content:
          'Aktywna rezerwacja gwarantuje pierwszeństwo zakupu danego egzemplarza do czasu jej wygaśnięcia.',
      },
      { content: 'Przy odbiorze może być wymagany kod rezerwacji.' },
      {
        content:
          'Jeżeli po obejrzeniu książki Kupujący rezygnuje z zakupu, książka wraca do sprzedaży.',
      },
    ],
  },
  {
    title: 'Rozliczenia i odbiór książek',
    items: [
      {
        content:
          'Po zakończeniu Targów Wystawiający otrzyma wiadomość e-mail z informacją:',
        subitems: [
          'które książki zostały sprzedane,',
          'jaka kwota jest do wypłaty,',
          'które książki należy odebrać,',
          'gdzie i kiedy można dokonać odbioru.',
        ],
      },
      {
        content:
          'Wypłata może nastąpić zgodnie z preferencją wybraną przez Użytkownika:',
        subitems: ['gotówką,', 'przelewem na telefon BLIK.'],
      },
      {
        content:
          'Przelew na telefon realizowany jest w terminie do 14 dni roboczych od zakończenia Targów.',
      },
      {
        content:
          'Użytkownik odpowiada za prawidłowość numeru telefonu podanego do wypłaty.',
      },
      {
        content:
          'W przypadku wypłaty gotówkowej termin odbioru zostanie wskazany w wiadomości e-mail.',
      },
      {
        content:
          'Po upływie standardowego terminu odbiór gotówki nadal jest możliwy, jednak wymaga indywidualnego ustalenia terminu z Organizatorem.',
      },
      {
        content:
          'Niesprzedane książki należy standardowo odebrać w terminie wskazanym w wiadomości Organizatora.',
      },
      {
        content: (
          <>
            Jeżeli Wystawiający nie może odebrać książki w wyznaczonym terminie,
            powinien wcześniej skontaktować się z Organizatorem pod adresem{' '}
            <a href="mailto:targi.pomoc@postol.tech">targi.pomoc@postol.tech</a>
            {'. Organizator może ustalić inny termin odbioru.'}
          </>
        ),
      },
      {
        content:
          'Jeżeli książka nie zostanie odebrana, Organizator wysyła dodatkowe przypomnienie.',
      },
      {
        content:
          'Jeżeli pomimo powiadomienia i przypomnienia książka nie zostanie odebrana w ciągu 14 dni roboczych od pierwszego powiadomienia, Organizator może – zgodnie z zasadami zaakceptowanymi przez Wystawiającego przy zgłoszeniu książki – przejąć ją nieodpłatnie i przeznaczyć na cele szkolne, przekazać dalej albo zutylizować.',
      },
      {
        content:
          'Informacja o zasadzie określonej w ust. 10 powinna być również widoczna przy wystawianiu książki.',
      },
      {
        content:
          'Jeżeli książka zostanie zgubiona albo uszkodzona podczas przechowywania przez Organizatora w sposób uniemożliwiający jej sprzedaż lub zwrot, Wystawiający otrzyma kwotę, którą wskazał przy jej wystawianiu.',
      },
    ],
  },
  {
    title: 'Serwis internetowy i reklamacje',
    items: [
      {
        content: 'Serwis umożliwia w szczególności:',
        subitems: [
          'utworzenie i obsługę konta,',
          'zgłaszanie książek,',
          'przeglądanie katalogu,',
          'dokonywanie i anulowanie rezerwacji,',
          'sprawdzanie własnych książek, rezerwacji i rozliczeń,',
          'otrzymywanie powiadomień dotyczących Targów.',
        ],
      },
      {
        content:
          'Do korzystania z Serwisu potrzebne są urządzenie z dostępem do Internetu, aktualna przeglądarka internetowa, włączona obsługa JavaScript oraz aktywny adres e-mail.',
      },
      {
        content:
          'Zabronione jest przesyłanie za pomocą Serwisu treści bezprawnych lub szkodliwych.',
      },
      {
        content:
          'Organizator może czasowo ograniczyć dostęp do części funkcji Serwisu w przypadku awarii, prac technicznych, zagrożenia bezpieczeństwa albo konieczności usunięcia błędu.',
      },
      {
        content: (
          <>
            Reklamacje i zgłoszenia dotyczące Targów można przesyłać na{' '}
            <a href="mailto:targi.pomoc@postol.tech">targi.pomoc@postol.tech</a>{' '}
            albo zgłaszać poprzez infolinię{' '}
            <a href="tel:+48776888416">+48 776 888 416</a>.
          </>
        ),
      },
      {
        content:
          'Reklamacje rozpatruje ścisły zarząd Samorządu Uczniowskiego, co do zasady w terminie do 14 dni roboczych.',
      },
      {
        content:
          'W przypadku istotnego sporu sprawa może zostać przekazana Dyrekcji Szkoły.',
      },
      {
        content:
          'Żądanie usunięcia konta można przesłać na adres kontaktowy. Konto może zostać usunięte po zakończeniu aktywnych rezerwacji, rozliczeniu wystawionych książek i wypłacie należnych środków.',
      },
    ],
  },
  {
    title: 'Dane osobowe i postanowienia końcowe',
    items: [
      {
        content:
          'Szczegółowe zasady dotyczące przetwarzania danych osobowych określa odrębna Polityka prywatności dostępna w Serwisie.',
      },
      {
        content: (
          <>
            Kontakt w sprawach dotyczących danych osobowych i usunięcia danych:{' '}
            <a href="mailto:admin@postol.tech">admin@postol.tech</a>.
          </>
        ),
      },
      {
        content:
          'Organizator może zmienić harmonogram Targów, uruchomić dodatkowy dzień sprzedaży, czasowo wstrzymać rezerwacje albo dokonać innych niezbędnych zmian organizacyjnych.',
      },
      {
        content:
          'O istotnych zmianach Organizator informuje za pomocą Serwisu, a w zależności od sytuacji również poprzez e-mail, Facebook lub Instagram Samorządu Uczniowskiego.',
      },
      {
        content:
          'Zmiany Regulaminu nie wpływają wstecz na zakończone transakcje ani nabyte już prawa do wypłaty.',
      },
      {
        content:
          'W sprawach nieuregulowanych Regulaminem zastosowanie mają obowiązujące przepisy oraz zasady obowiązujące na terenie Zespołu Szkół Elektrycznych.',
      },
      {
        content:
          'Regulamin wchodzi w życie przed rozpoczęciem Targów i obowiązuje przez okres ich organizacji oraz do zakończenia wszystkich wynikających z nich rozliczeń.',
      },
    ],
  },
];

export default function RegulaminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="page-container flex-1 py-10 sm:py-14 lg:py-16">
        <h1 className="page-heading max-w-4xl">
          Regulamin Targów Książek 2026
        </h1>

        <div className="mt-8 grid items-start gap-7 sm:mt-10 lg:grid-cols-[minmax(0,820px)_minmax(220px,1fr)] lg:gap-10">
          <nav
            aria-label="Spis treści regulaminu"
            className="order-1 rounded-2xl border border-border bg-surface-soft p-5 lg:sticky lg:top-24 lg:order-2"
          >
            <h2 className="font-display text-base font-semibold">
              Spis treści
            </h2>
            <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    href={`#paragraf-${index + 1}`}
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
            {sections.map((section, sectionIndex) => (
              <section key={section.title} id={`paragraf-${sectionIndex + 1}`}>
                <h2 className="flex items-baseline gap-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  <span className="shrink-0 text-green-ink">
                    §{sectionIndex + 1}.
                  </span>
                  <span>{section.title}</span>
                </h2>
                <ol className="mt-5 list-decimal space-y-4 pl-5 text-base leading-[1.8] text-muted-foreground marker:font-medium marker:text-foreground sm:pl-6">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="pl-1.5">
                      <div>{item.content}</div>
                      {item.subitems && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-green-ink">
                          {item.subitems.map((subitem, subitemIndex) => (
                            <li key={subitemIndex} className="pl-1">
                              {subitem}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}

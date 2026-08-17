# Podręcznikowo - Szkolny Marketplace Podręczników

Scentralizowana platforma e-commerce dla szkolnych targów podręczników. Uczniowie mogą przeglądać, rezerwować i kupować używane podręczniki, podczas gdy administratorzy (samorząd uczniowski) zarządzają katalogiem, dodają egzemplarze i rozliczają ich właścicieli.

## 🎯 Biznesowy Opis Projektu

Podręcznikowo rozwiązuje problem kosztownych zakupów nowych podręczników szkolnych poprzez stworzenie bezpiecznego, zautomatyzowanego marketplace'u dla społeczności szkolnej. Platforma łączy uczniów chcących sprzedać swoje używane podręczniki z tymi, którzy ich potrzebują, zapewniając:

- **Transparentność cen** - uczniowie otrzymują uczciwą wartość za swoje książki
- **Automatyzację** - system rezerwacji i płatności bez konieczności osobistego kontaktu
- **Bezpieczeństwo** - weryfikacja tożsamości przez Supabase Auth i bezpieczne płatności
- **Efektywność** - samorząd uczniowski zarządza procesem bez konieczności ręcznej administracji

## 🛠 Tech Stack

### Frontend
- **Next.js 16.2.10 (App Router)** - Nowoczesny framework React z renderowaniem po stronie serwera, optymalizacją obrazów i routingiem opartym na systemie plików
- **TypeScript 5** - Statyczne typowanie dla zwiększenia niezawodności kodu i lepszej obsługi IDE
- **Tailwind CSS 4** - Utility-first CSS framework dla szybkiego rozwoju UI z @tailwindcss/postcss
- **shadcn/ui** - Biblioteka komponentów UI zbudowana na Radix UI, zapewniająca dostępność i konfigurowalność
- **Lucide React** - Zbiór ikon SVG o spójnym stylu

### Backend & Baza Danych
- **Supabase** - Backend-as-a-Service zapewniający:
  - PostgreSQL z automatycznym skalowaniem
  - Row Level Security (RLS) dla bezpieczeństwa danych
  - Real-time subscriptions
  - Storage dla plików (zdjęcia okładek)
- **Prisma 7** - ORM dla type-safe zapytań do bazy danych z adapterem `@prisma/adapter-pg`
- **Next.js Server Actions** - Bezpieczne operacje po stronie serwera bez konieczności tworzenia oddzielnych API endpointów

### AI & Ekstrakcja Danych
- **Google Gemini 2.0 Flash** - Model AI do ekstrakcji danych ze zdjęć okładek podręczników (tytuł, autor, przedmiot, stan, sugerowana cena)
- **Vercel AI SDK** - Uproszczona integracja z modelami AI

### Bezpieczeństwo & DevOps
- **Zod** - Walidacja schematów dla wszystkich granic wejścia po stronie serwera
- **Sonner** - System toast notifications dla UX
- **Docker** - Konteneryzacja dla produkcji z multi-stage build
- **GitHub Actions** - CI/CD pipeline z automatycznym skanowaniem bezpieczeństwa (Snyk, Trivy)

### Uzasadnienie Wyboru Technologii

- **Next.js 16** - Najnowsza wersja z Turbopack dla szybszego developmentu, App Router dla lepszego SEO i wydajności
- **Supabase** - Eliminuje konieczność konfiguracji infrastruktury backend, zapewniając gotowe rozwiązania autentykacji, bazy danych i RLS
- **Prisma** - Type-safe ORM z doskonałym DX i automatycznym generowaniem TypeScript types
- **Tailwind CSS 4** - Najnowsza wersja z lepszą wydajnością i nowym silnikiem postcss
- **shadcn/ui** - Komponenty kopiowane do projektu (nie zależności), co zapewnia pełną kontrolę i brak "vendor lock-in"

## ✨ Kluczowe Funkcjonalności

### Dla Uczniów
- **Przeglądanie katalogu** - Wyszukiwanie podręczników według tytułu, autora, przedmiotu i stanu
- **Rezerwacja książek** - System rezerwacji z 15-minutowym oknem czasowym na płatność
- **Koszyk zakupowy** - Dodawanie wielu książek do koszyka i płatność w jednym Checkout
- **Powiadomienia** - System powiadomień o statusie rezerwacji (zrealizowana, anulowana)
- **Historia zakupów** - Przeglądanie przeszłych zamówień

### Dla Administratorów (Samorząd Uczniowski)
- **Dodawanie książek** - Formularz z automatyczną ekstrakcją danych ze zdjęcia okładki (AI)
- **Zarządzanie rezerwacjami** - Panel do przeglądania aktywnych rezerwacji
- **Realizacja zamówień** - Oznaczanie rezerwacji jako zrealizowanych (książka odebrana)
- **Anulowanie rezerwacji** - Anulowanie rezerwacji po wygaśnięciu terminu odbioru
- **Dashboard** - Przegląd statystyk i aktywności

### Bezpieczeństwo
- **Row Level Security (RLS)** - Użytkownicy mają dostęp tylko do swoich danych
- **Walidacja Zod** - Wszystkie dane wejściowe są walidowane po stronie serwera
- **Secure Headers** - CSP, HSTS, X-Frame-Options w next.config.ts
- **Environment Variables** - Wszystkie sekrety przechowywane poza kodem

## 🚀 Szybki Start

### Wymagania Wstępne
- Node.js 20+
- pnpm 11+
- Konto Supabase (darmowe tier wystarcza)
- Konto Stripe (opcjonalne, dla płatności)

### Instalacja Lokalna

```bash
# Klonuj repozytorium
git clone <repository-url>
cd E-commerce

# Zainstaluj zależności
pnpm install

# Skopiuj plik środowiskowy
cp .env.example .env.local

# Uzupełnij zmienne środowiskowe w .env.local:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL (Supabase Pooler connection string)
# - DIRECT_URL (Supabase Direct connection string)
# - GEMINI_API_KEY (dla ekstrakcji danych ze zdjęć)

# Zastosuj migracje Prisma
pnpm db:migrate -- --name init

# Uruchom serwer deweloperski
pnpm dev
```

Aplikacja będzie dostępna na `http://localhost:3000`

### Uruchomienie z Dockera

```bash
# Zbuduj obraz Docker
docker build -t podręcznikowo .

# Uruchom kontener
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  -e DATABASE_URL=your_database_url \
  -e DIRECT_URL=your_direct_url \
  -e GEMINI_API_KEY=your_gemini_key \
  podręcznikowo
```

### Połączenia Supabase

Ważne rozróżnienie między dwoma connection strings:

- **DATABASE_URL** - Connection string przez Supabase Pooler (Transaction mode lub Session mode). Używany przez działającą aplikację do optymalizacji połączeń.
- **DIRECT_URL** - Connection string bezpośrednio do bazy danych. Używany przez Prisma CLI do generowania klienta i stosowania migracji.

Oba adresy znajdziesz w **Supabase Dashboard → Project Settings → Database → Connection string**.

⚠️ **Nigdy nie umieszczaj kluczy serwisowych ani URL bazy danych w zmiennych z prefiksem `NEXT_PUBLIC_`** - te zmienne są dostępne w przeglądarce.

## 🔧 Polecenia

```bash
# Development
pnpm dev              # Uruchom serwer deweloperski
pnpm build            # Generuj Prisma Client i zbuduj Next.js
pnpm start            # Uruchom produkcję (po build)
pnpm lint             # Uruchom ESLint

# Baza danych (Prisma)
pnpm db:validate      # Sprawdź schema.prisma
pnpm db:generate      # Wygeneruj klienta Prisma
pnpm db:migrate -- --name <nazwa>  # Utwórz nową migrację
pnpm db:deploy        # Zastosuj istniejące migracje na produkcji
pnpm db:studio        # Uruchom Prisma Studio (GUI)

# Czyszczenie (przed Docker build)
pnpm clean            # Usuń .next, node_modules, cache
pnpm clean:full       # Pełne czyszczenie + dane Supabase lokalne
pnpm clean:deps       # Usuń tylko node_modules
pnpm clean:build      # Usuń tylko build artifacts
```

## 📁 Architektura i Struktura Katalogów

```
E-commerce/
├── prisma/
│   ├── schema.prisma              # Model danych, relacje, indeksy
│   └── migrations/                # Historia migracji bazy danych
├── supabase/
│   └── migrations/                # Migracje Supabase (RLS, funkcje)
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Trasy autentykacji (login, signup)
│   │   ├── admin/               # Panel administratora
│   │   ├── api/                 # API Route Handlers (Stripe webhook)
│   │   ├── layout.tsx           # Główny layout
│   │   └── page.tsx             # Strona główna
│   ├── actions/                  # Server Actions
│   │   ├── notifications.ts     # Akcje powiadomień
│   │   ├── admin.ts             # Akcje administratora
│   │   └── extract-book-data.ts # Ekstrakcja danych AI
│   ├── components/
│   │   ├── layout/              # Navbar, Footer
│   │   ├── site/                # Komponenty specyficzne dla aplikacji
│   │   │   ├── notification-dropdown.tsx
│   │   │   ├── admin-dashboard.tsx
│   │   │   └── cart-drawer.tsx
│   │   └── ui/                  # Komponenty shadcn/ui
│   ├── lib/
│   │   ├── supabase/            # Klient Supabase
│   │   ├── prisma.ts            # Singleton Prisma + adapter
│   │   └── validations/         # Schematy Zod
│   └── generated/prisma/        # Generowany klient (ignorowany przez Git)
├── public/                       # Statyczne assets
├── Dockerfile                    # Multi-stage Docker build
├── .dockerignore                 # Wykluczenia dla Docker
├── .github/workflows/            # CI/CD pipeline
├── next.config.ts                # Konfiguracja Next.js + security headers
├── tsconfig.json                 # Konfiguracja TypeScript
└── package.json                 # Zależności i skrypty
```

## 🔐 Bezpieczeństwo

### Row Level Security (RLS)
Wszystkie tabele w Supabase mają włączone RLS:
- Użytkownicy mogą widzieć tylko swoje dane
- Administratorzy mają uprawnienia do modyfikacji wszystkich danych
- Service role używany tylko do operacji systemowych

### Security Headers
Aplikacja wykorzystuje następujące nagłówki bezpieczeństwa:
- **Content-Security-Policy** - Ogranicza źródła skryptów, stylów, obrazów
- **Strict-Transport-Security (HSTS)** - Wymusza HTTPS
- **X-Frame-Options** - Zapobiega clickjacking
- **X-Content-Type-Options** - Zapobiega MIME sniffing
- **Referrer-Policy** - Kontroluje informacje o referer

### Docker Security
- Kontener działa jako non-root user (`nextjs`)
- Minimalny obraz Alpine Linux
- Multi-stage build dla minimalnego rozmiaru
- Brak sekretów w warstwach obrazu

## 📊 Model Rezerwacji

System rezerwacji wykorzystuje transakcje bazy danych dla atomowości:

1. **Rezerwacja** (Server Action w jednej transakcji):
   - Zmienia status książki z `AVAILABLE` na `RESERVED`
   - Ustawia `reservedUntil` na `now + 15 minut`
   - Tworzy rekord `Order` ze statusem `PENDING`
   - Zapisuje identyfikator sesji Stripe

2. **Płatność** (Stripe Webhook):
   - Po udanej płatności zmienia `Order` na `PAID`
   - Zmienia książkę na `SOLD`
   - Wysyła powiadomienie do użytkownika

3. **Wygasłe rezerwacje**:
   - Automatycznie zwalniane przed każdą próbą rezerwacji
   - Można również zwolnić przez zaplanowane zadanie (cron)

## 🧪 Testowanie

```bash
# Uruchom testy (gdy dodane)
pnpm test

# Testy E2E (gdy dodane)
pnpm test:e2e
```

## 📝 Przyszłe Rozwinięcia

- [ ] Integracja Stripe Checkout dla płatności online
- [ ] System ocen i recenzji książek
- [ ] Rekomendacje AI na podstawie historii zakupów
- [ ] Aplikacja mobilna (React Native)
- [ ] Integracja z systemem szkolnym (lista uczniów, przedmiotów)
- [ ] Raporty i analityka dla samorządu

## 🤝 Współpraca

Wkłady są mile widziane! Proszę:
1. Forknij repozytorium
2. Utwórz branch dla feature'a (`git checkout -b feature/AmazingFeature`)
3. Commituj zmiany (`git commit -m 'Add some AmazingFeature'`)
4. Pushuj do branch'a (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

## 📄 Licencja

Ten projekt jest licencjonowany - patrz plik LICENSE dla szczegółów.

## 📞 Kontakt

W razie pytań lub problemów, proszę otworzyć issue w repozytorium.

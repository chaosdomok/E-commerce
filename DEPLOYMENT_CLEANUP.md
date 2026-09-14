# Bezpieczne wdrażanie na pojedynczy VPS

Nie buduj aplikacji w aktywnym `/root/E-commerce`. Zmiana `.next` pod działającym
procesem może połączyć HTML i identyfikatory Server Actions z różnych buildów.

Kod nowej wersji wgraj do osobnego katalogu, bez `.env*`, `.next` i
`node_modules`, a następnie uruchom z tego katalogu:

```sh
chmod +x scripts/deploy.sh
SOURCE_DIR="$PWD" bash scripts/deploy.sh
```

Skrypt:

- kopiuje źródła do nowego katalogu w `/root/E-commerce-releases`,
- przechowuje produkcyjny `.env.local` poza release'ami i tylko linkuje go do
  nowej wersji,
- wykonuje `npm ci` i pełny build przed przełączeniem,
- ustawia unikalny `NEXT_DEPLOYMENT_ID` dla ochrony przed version skew,
- zatrzymuje PM2 dopiero po udanym buildzie, przełącza `/root/E-commerce` na
  gotowy release i natychmiast uruchamia nową wersję,
- wykonuje health check i automatycznie
  wraca do poprzedniej wersji po nieudanym starcie,
- zachowuje pięć najnowszych release'ów oraz bezpośredni cel rollbacku.

Skrypt nie wykonuje migracji. Jeżeli wydanie zawiera migrację, zastosuj ją
osobno, po przeglądzie SQL i wykonaniu backupu, zgodnie z procedurą dla danego
wydania.

Ręczny rollback do zachowanego release'u:

```sh
ln -s /root/E-commerce-releases/NAZWA_POPRZEDNIEGO_RELEASE /root/E-commerce.rollback
mv -Tf /root/E-commerce.rollback /root/E-commerce
cd /root/E-commerce
pm2 restart e-commerce --update-env
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
pm2 save
```

Proces nadal startuje przez `npm start`, czyli:

```text
node --env-file=.env.local scripts/start-standalone.mjs
```

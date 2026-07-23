# Turniej u Siary — instrukcja wdrożenia na Vercel

## Co się zmieniło względem Twojego pliku

1. **PIN wymagany raz na 30 minut** — po poprawnym wpisaniu PIN-u zapisuje się
   znacznik czasu w `sessionStorage` (`siaryPinVerifiedUntil`). Dopóki nie minie
   30 minut i karta przeglądarki nie zostanie zamknięta, kolejne akcje
   (dodawanie graczy, wpisywanie wyników itd.) wykonują się bez pytania o PIN.
   Po zamknięciu karty albo po 30 minutach PIN jest wymagany ponownie.
2. **Zdjęcia zawodników trafiają do Vercel Blob**, a nie do bazy jako base64.
   Po wybraniu pliku frontend zmniejsza go do ~128px (jak dotychczas), wysyła
   do `/api/upload`, a w stanie turnieju zapisywany jest już tylko publiczny
   URL zdjęcia z Blob Storage — dzięki temu rekordy w Redisie są dużo mniejsze.
3. **`/api/state`** korzysta teraz z Upstash Redis (`@upstash/redis`) zamiast
   nieistniejącego wcześniej backendu.

## Pliki do wgrania do aktywnego projektu Vercel

```
index.html          ← podmień istniejący plik główny
api/state.mjs        ← nowy endpoint GET/POST stanu turnieju
api/upload.mjs        ← nowy endpoint uploadu zdjęć
package.json          ← dodaj zależności (jeśli masz już package.json, dopisz
                         "@upstash/redis" i "@vercel/blob" do "dependencies")
```

Pliki mają rozszerzenie **`.mjs`**, nie `.js` — to celowe. Dzięki temu Vercel
zawsze traktuje je jako ES Moduły (`import`/`export`), niezależnie od tego,
czy Twój `package.json` ma `"type": "module"`. To najczęstsza przyczyna błędu
500 na `/api/state` przy pliku `.js` — funkcja wywala się, zanim w ogóle
dotknie Redisa. Jeśli w projekcie masz stare pliki `api/state.js` /
`api/upload.js`, **usuń je**, żeby nie kolidowały z nowymi trasami.

## Jak zdiagnozować błąd 500 na /api/state

Sam status `500` w konsoli przeglądarki nic nie mówi o przyczynie. Trzeba
zobaczyć treść odpowiedzi:

1. DevTools → zakładka **Network** → kliknij żądanie `state` → zakładka
   **Response**. Zaktualizowany kod zwraca teraz w polu `detail` dokładny
   komunikat błędu (np. brakująca zmienna środowiskowa).
2. Albo w Vercel: Deployments → najnowszy deploy → zakładka **Logs** /
   **Observability** — tam pojawi się pełny stack trace.

Najczęstsze przyczyny:
- Zmienne środowiskowe (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
  albo `BLOB_READ_WRITE_TOKEN`) zostały dodane **po** ostatnim deployu —
  Vercel nie podłącza nowych env vars do istniejącego builda automatycznie,
  trzeba zrobić redeploy (Deployments → ⋯ → Redeploy, albo nowy `git push`).
- Zmienne są dodane tylko dla środowiska "Preview", a testujesz na
  "Production" (albo odwrotnie) — sprawdź w Settings → Environment Variables,
  dla jakich środowisk są zaznaczone.
- Stare pliki `.js` z `import/export` nadal leżą w `api/` obok nowych `.mjs`.

## Konfiguracja bazy danych (Upstash Redis)

1. W projekcie na Vercel wejdź w **Storage** → sprawdź, czy masz podłączoną
   bazę Upstash Redis / Vercel KV.
2. W **Settings → Environment Variables** powinny być (Vercel dodaje je
   automatycznie po połączeniu integracji):
   - `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`
   (albo starsze nazwy `KV_REST_API_URL` / `KV_REST_API_TOKEN` — kod w
   `api/state.mjs` obsługuje obie wersje nazw).
3. Po dodaniu/zmianie zmiennych zrób **redeploy** — to najczęściej pomijany
   krok.

## Konfiguracja Vercel Blob (przechowywanie zdjęć)

1. W projekcie na Vercel: **Storage → Create Database → Blob** (jeśli jeszcze
   nie masz podłączonego Blob Store).
2. Po utworzeniu/podłączeniu Vercel doda automatycznie zmienną środowiskową
   `BLOB_READ_WRITE_TOKEN` do projektu — `api/upload.mjs` używa jej niejawnie
   (pakiet `@vercel/blob` sam ją odczytuje).
3. Zdjęcia trafiają do folderu `avatars/` w Blob Storage jako pliki publiczne
   (dostępne pod stałym URL-em, bez logowania).

## Instalacja zależności i deploy

```bash
npm install @upstash/redis @vercel/blob
vercel deploy --prod
```

(albo po prostu `git push`, jeśli projekt jest podpięty pod auto-deploy).

## Uwaga o bezpieczeństwie PIN-u

PIN (`1337` w kodzie) nadal jest sprawdzany wyłącznie po stronie przeglądarki
— tak jak w oryginalnym pliku. To znaczy, że każdy, kto zajrzy w kod źródłowy
strony, PIN zobaczy. Jeśli zależy Ci na realnym zabezpieczeniu zapisu wyników,
mogę dorobić weryfikację PIN-u po stronie serwera — daj znać.

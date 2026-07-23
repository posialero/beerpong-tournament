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
index.html        ← podmień istniejący plik główny
api/state.js       ← nowy endpoint GET/POST stanu turnieju
api/upload.js      ← nowy endpoint uploadu zdjęć
package.json       ← dodaj zależności (jeśli masz już package.json, dopisz
                      "@upstash/redis" i "@vercel/blob" do "dependencies")
```

Jeśli Twój aktywny projekt jest oparty o Next.js (a nie "czysty" Vercel z
folderem `api/`), daj znać — trzeba będzie przenieść handlery do
`pages/api/` lub `app/api/.../route.js` (logika w środku zostaje taka sama,
zmienia się tylko sygnatura funkcji).

## Konfiguracja bazy danych (Upstash Redis)

Skoro baza już u Ciebie stoi jako Upstash Redis podpięty przez Vercel:

1. W projekcie na Vercel wejdź w **Storage** → sprawdź, czy masz podłączoną
   bazę Upstash Redis / Vercel KV.
2. Upewnij się, że w **Settings → Environment Variables** projektu są ustawione
   (Vercel dodaje je automatycznie po połączeniu integracji):
   - `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`
   (albo starsze nazwy `KV_REST_API_URL` / `KV_REST_API_TOKEN` — kod w
   `api/state.js` obsługuje obie wersje nazw).
3. Nic więcej nie trzeba konfigurować — endpoint sam odczyta te zmienne.

## Konfiguracja Vercel Blob (przechowywanie zdjęć)

1. W projekcie na Vercel: **Storage → Create Database → Blob** (jeśli jeszcze
   nie masz podłączonego Blob Store).
2. Po utworzeniu/podłączeniu Vercel doda automatycznie zmienną środowiskową
   `BLOB_READ_WRITE_TOKEN` do projektu — `api/upload.js` używa jej niejawnie
   (pakiet `@vercel/blob` sam ją odczytuje).
3. Zdjęcia będą trafiać do folderu `avatars/` w Blob Storage jako pliki
   publiczne (dostępne pod stałym URL-em, bez logowania).

## Instalacja zależności i deploy

```bash
npm install @upstash/redis @vercel/blob
vercel deploy --prod
```

(albo po prostu `git push` jeśli projekt jest podpięty pod auto-deploy).

## Uwaga o bezpieczeństwie PIN-u

PIN (`1337` w kodzie) nadal jest sprawdzany wyłącznie po stronie przeglądarki
— tak jak w oryginalnym pliku. To znaczy, że każdy, kto zajrzy w kod źródłowy
strony, PIN zobaczy. Jeśli zależy Ci na realnym zabezpieczeniu zapisu wyników
(a nie tylko na "furtce przed przypadkowym kliknięciem"), mogę dorobić
weryfikację PIN-u po stronie serwera (endpoint `/api/verify-pin` zwracający
jednorazowy token) — daj znać, jeśli chcesz to dodać.

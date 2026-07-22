# Turniej Beer Pong — wersja z bazą danych

Ten projekt to Twój oryginalny tracker turnieju, tylko że dane (lista
zawodników i wyniki meczów) są teraz zapisywane po stronie serwera
(Vercel KV — mały Redis), a nie w pamięci karty przeglądarki. Dzięki temu
każdy, kto wejdzie pod ten sam adres, widzi te same dane i może je
edytować (odświeżanie co 5 sekund w tle synchronizuje zmiany między
telefonami).

## Struktura

```
index.html      – frontend (ten sam layout co oryginał + synchronizacja z API)
api/state.js    – serverless function: GET (odczyt) / POST (zapis) stanu
package.json    – zależność @vercel/kv
```

## Ważne: dlaczego Vercel, a nie GitHub Pages

GitHub Pages to hosting **wyłącznie statyczny** — nie ma tam żadnego
backendu ani miejsca na bazę danych, więc zapisywanie wyników nie
zadziała, jeśli wrzucisz to tylko tam. Vercel obsługuje zarówno statyczny
frontend, jak i mikro-API (`api/state.js`) razem z bazą (Vercel KV).
Możesz jednak trzymać kod na GitHubie i połączyć repo z Vercelem —
wtedy każdy `git push` automatycznie wdraża nową wersję na Vercel.

## Wdrożenie krok po kroku

### 1. Wrzuć kod na GitHuba
```bash
cd beerpong-app
git init
git add .
git commit -m "Turniej beer pong z bazą danych"
git branch -M main
git remote add origin https://github.com/TWOJ-LOGIN/beerpong-turniej.git
git push -u origin main
```

### 2. Załóż projekt na Vercel
1. Wejdź na https://vercel.com i zaloguj się (najprościej przez GitHub).
2. Kliknij **Add New → Project** i wybierz repo `beerpong-turniej`.
3. Framework Preset zostaw jako **Other** — nie trzeba nic zmieniać w
   build settings, projekt nie wymaga kroku budowania.
4. Kliknij **Deploy**. Na tym etapie strona już się wdroży, ale zapis
   jeszcze nie zadziała, bo brakuje bazy — patrz krok 3.

### 3. Podłącz Vercel KV (baza danych)
1. W panelu projektu na Vercel wejdź w zakładkę **Storage**.
2. Kliknij **Create Database** → wybierz **KV** (Upstash Redis, plan
   darmowy w zupełności wystarczy na ten projekt).
3. Po utworzeniu bazy podłącz ją do projektu (przycisk **Connect Project**
   przy bazie, jeśli nie zrobi się to automatycznie). Vercel sam doda
   potrzebne zmienne środowiskowe (`KV_REST_API_URL`, `KV_REST_API_TOKEN`
   itd.) do projektu.
4. Zrób redeploy (zakładka **Deployments** → **⋯** przy najnowszym
   wdrożeniu → **Redeploy**), żeby function `api/state.js` zobaczyła
   nowe zmienne środowiskowe.

### 4. Gotowe
Otwórz adres projektu (np. `https://beerpong-turniej.vercel.app`) —
u góry strony powinien pojawić się zielony wskaźnik "Połączono z bazą".
Dodaj zawodników i wpisuj wyniki — będą widoczne dla każdego, kto wejdzie
pod ten sam link.

## Wdrożenie przez CLI (alternatywa dla kroku 1-2)

Jeśli wolisz bez GitHuba, z terminala:
```bash
npm install -g vercel
cd beerpong-app
vercel        # pierwsze wdrożenie, odpowiedz na pytania
vercel --prod # wdrożenie produkcyjne
```
Bazę KV i tak trzeba podłączyć ręcznie w panelu (krok 3 powyżej).

## Znane ograniczenia

- Brak logowania/autoryzacji — każdy ze znajomością adresu strony może
  edytować dane. Wystarczające na domowy/imprezowy turniej; jeśli
  potrzebujesz zabezpieczenia, można dodać prosty PIN sprawdzany w
  `api/state.js`.
- Dane trzymane są pod jednym kluczem w KV (`beerpong:state`) — jeśli
  chcesz obsłużyć wiele turniejów jednocześnie, trzeba by dodać
  identyfikator turnieju w URL i kluczu KV. Daj znać, jeśli to
  potrzebne — mogę to dopisać.

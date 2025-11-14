# Wytyczne dla agenta (GEMINI.md)

Ten plik służy jako stały kontekst pracy dla agenta w tym repozytorium. Zasady obowiązują w całym projekcie (root scope).

## Projekt w skrócie
- Backend: FastAPI (Python 3.11) — katalog `backend/app`
- Frontend: React + Vite — katalog `frontend`
- Uruchamianie: Docker Compose — usługi `api` (port 8000) i `frontend` (port 5173)
- Baza danych: SQLite — plik `storage/app.db` (wolumen montowany do kontenera `api`)

## Podsumowanie Aplikacji

Aplikacja `kartoteka-2.0` to zaawansowane narzędzie do zarządzania kolekcją kart, integrujące skanowanie, wycenę oraz publikację produktów w sklepie internetowym Shoper. System składa się z backendu w technologii FastAPI oraz frontendu w React, zoptymalizowanego zarówno dla urządzeń mobilnych (Android), jak i desktopowych.

### Główne Funkcjonalności:

1.  **Skanowanie i Rozpoznawanie Kart:**
    *   **Desktop:** Umożliwia przesyłanie pojedynczych plików graficznych lub całych folderów ze skanami kart. System automatycznie analizuje obraz, rozpoznaje kartę (nazwa, numer, zestaw) i sugeruje najbardziej prawdopodobne dopasowania, korzystając z zewnętrznego API (TCGGO).
    *   **Mobile (Android):** Oferuje skanowanie na żywo za pomocą aparatu, z funkcjami takimi jak zoom, latarka i wizualne wskazówki (ramka wokół karty), co zapewnia natychmiastową informację zwrotną.

2.  **Zarządzanie Danymi i Wycena:**
    *   Po zeskanowaniu lub ręcznym wyszukaniu, użytkownik ma dostęp do szczegółowego formularza, który jest automatycznie wypełniany danymi karty.
    *   System pobiera i wyświetla ceny rynkowe (w tym warianty "Holo" i "Reverse Holo"), a także pozwala na ręczną korektę danych i cen.
    *   Aplikacja mapuje właściwości karty (np. rzadkość, typ) na atrybuty Shoper, automatyzując przygotowanie produktu do sprzedaży.

3.  **Moduł Wyceny:**
    *   Dedykowana sekcja do szybkiej wyceny kart poprzez ręczne wyszukiwanie lub skanowanie na żywo (na urządzeniach mobilnych).
    *   Wyświetla szczegółowe dane cenowe, w tym ceny sprzedaży, zakupu oraz średnie rynkowe z ostatnich 7 i 30 dni.

4.  **Integracja ze Sklepem Shoper:**
    *   Umożliwia bezpośrednią publikację zeskanowanych i wycenionych kart jako produktów w sklepie Shoper.
    *   Automatycznie generuje kod produktu i zarządza atrybutami.
    *   Posiada funkcję powiadomień push (dla Androida) o nowych zamówieniach w sklepie.

5.  **Interfejs Użytkownika:**
    *   Zapewnia responsywny i dostosowany interfejs dla różnych platform.
    *   Oferuje wizualne efekty dla różnych rzadkości kart (np. "Holo", "Gold"), co poprawia doświadczenie użytkownika.
    *   Obsługuje wykrywanie duplikatów, aby zapobiec wielokrotnemu dodawaniu tych samych kart.


## Jak uruchamiać
- Całość: `docker compose up -d --build`
- Dostęp:
  - Frontend: `http://<IP_SERWERA>:5173`
  - API health: `http://<IP_SERWERA>:8000/health`

## Zmienne środowiska (kluczowe)
- Definiowane w `docker-compose.yml` i `backend/.env[.example]`
- Najważniejsze:
  - `OPENAI_API_KEY` — opcjonalny klucz do OCR/vision
  - `SHOPER_BASE_URL`, `SHOPER_ACCESS_TOKEN` — integracja z Shoper
  - `EUR_PLN_RATE`, `PRICE_MULTIPLIER` — parametry wyceny

## Konwencje
- **Backend (FastAPI):**
  - Asynchroniczne endpointy z I/O.
  - Obsługa błędów przez `JSONResponse`.
  - Baza danych SQLAlchemy + SQLite.
- **Frontend (Vite):**
  - TypeScript + Vite.
  - Opcjonalne `VITE_API_BASE_URL`.

## Struktura katalogów (ważne ścieżki)
- `backend/app/main.py` — główne endpointy FastAPI
- `backend/app/settings.py` — konfiguracja i zmienne środowiskowe
- `storage/` — baza SQLite i uploady
- `frontend/` — aplikacja Vite

## Wytyczne dla rozwoju Frontend (Mobile vs. Desktop)

W projekcie `kartoteka-2.0` komponenty frontendowe, takie jak `ScanView`, są często współdzielone między wersjami mobilnymi (Android) i desktopowymi. Aby zapewnić spójność i uniknąć regresji, należy przestrzegać następujących wytycznych:

-   **Rozróżnianie platform:** Używaj zmiennej `isAndroid` (lub podobnych mechanizmów wykrywania platformy) do warunkowego renderowania elementów UI i logiki specyficznej dla danej platformy.
-   **Widok mobilny (Android):**
    -   **Skanowanie na żywo:** Priorytetem jest interfejs oparty na kamerze na żywo (elementy `<video>`, `<canvas>`).
    -   **Interakcje:** Projektuj pod kątem interakcji dotykowych (np. tap-to-focus, suwaki zoomu).
    -   **Wydajność:** Zwracaj szczególną uwagę na wydajność, zwłaszcza przy przetwarzaniu obrazu w czasie rzeczywistym.
    -   **Elementy UI:** Kontrolki takie jak latarka, zoom, status skanowania i wizualne nakładki (`overlay`) są kluczowe.
-   **Widok desktopowy:**
    -   **Przesyłanie plików:** Głównym mechanizmem wprowadzania danych jest przesyłanie plików graficznych.
    -   **Formularze:** Interfejs oparty na formularzach do edycji danych karty.
    -   **Interakcje:** Obsługa zdarzeń myszy (np. efekt lupy na podglądzie obrazu).
    -   **Elementy UI:** Pola wyboru plików, przyciski wysyłania, rozbudowane formularze z listami rozwijanymi.
-   **Współdzielone komponenty:** Przy modyfikowaniu komponentów używanych na obu platformach zawsze testuj zmiany zarówno na urządzeniach mobilnych, jak i na desktopie, aby upewnić się, że funkcjonalność i wygląd są poprawne.
-   **Unikaj regresji:** Zawsze upewnij się, że zmiany wprowadzone dla jednej platformy nie wpływają negatywnie na drugą.

## Przydatne endpointy API (skrót)
- `GET /health` — status
- `POST /scan/commit` — zapis skanu
- `POST /pricing/estimate` — wycena
- `GET /shoper/attributes`, `GET /shoper/categories` — taksonomia Shoper
- `POST /sessions/start`, `GET /sessions/{id}/summary`, `POST /sessions/{id}/publish` — sesje i publikacja

## Historia zmian

### Moduł Wyceny (Pricing)
- **Gruntowna przebudowa modułu:** Moduł "Wycena" został całkowicie przeprojektowany, aby służyć jako narzędzie do wyceny kart, a nie do wyświetlania zeskanowanych pozycji.
- **Ekran wyboru metody:** Dodano nowy ekran, który pozwala użytkownikowi wybrać metodę wyceny:
  - **Wpisz ręcznie** (Desktop/Mobile)
  - **Skanowanie na żywo** (Mobile)
  - **Wgraj plik CSV** (Desktop, placeholder)
- **Wyszukiwanie ręczne:** Zaimplementowano pełną funkcjonalność ręcznego wyszukiwania kart po nazwie i numerze. Stworzono dedykowany endpoint backendowy (`/pricing/manual_search`), który komunikuje się z API TCGGO.
- **Skanowanie na żywo:** Dodano możliwość wyceny kart w czasie rzeczywistym za pomocą aparatu w telefonie, wykorzystując do tego nowy, dedykowany hook (`useLivePricingScan`).
- **Szczegółowy widok cen:** Po znalezieniu karty, interfejs wyświetla teraz szczegółowe informacje o cenach, w tym:
  - Cenę sprzedaży (w PLN)
  - Cenę zakupu (obliczaną jako 80% ceny rynkowej)
  - Średnie ceny z 7 i 30 dni z Cardmarket (w PLN)
  - Ceny dla kart gradowanych (PSA, BGS, CGC) w PLN, jeśli są dostępne.
- **Algorytm szacowania cen wariantów:** Wprowadzono mechanizm, który estymuje ceny dla wariantów "Holo" (mnożnik 3.0x) i "Reverse Holo" (mnożnik 2.0x), gdy API nie dostarcza dla nich dokładnych danych. Oszacowane ceny są oznaczone w interfejsie za pomocą dymka z podpowiedzią.
- **Wizualne efekty rzadkości:** Aplikacja nakłada teraz na obrazek karty specjalny, wizualny "overlay", który odpowiada jej rzadkości (np. Holo, Reverse Holo, Gold, Rainbow, Amazing Rare, Shiny, Full Art), co znacząco poprawia doświadczenie użytkownika.

### Moduł Skanowania Kart (Live Scan)
- **Ujednolicenie logiki skanowania:** Zidentyfikowano, że moduły "Wyceny" i "Skanowania Kart" używały dwóch różnych implementacji do skanowania na żywo (`useLivePricingScan` i `useLiveScan`). Przeprowadzono gruntowną refaktoryzację obu hooków, aby ujednolicić ich działanie i wprowadzić nowe funkcje.
- **Poprawa stabilności:** Zmieniono sposób inicjalizacji kamery w obu hookach, przechodząc na wzorzec *callback ref*. Usunęło to błędy związane z timingiem i zapewniło, że logika kamery uruchamia się dopiero po pełnym załadowaniu elementu wideo, co naprawiło problemy z niedziałającymi funkcjami (np. zoom).
- **Dodanie funkcji Zoom:** W obu modułach skanowania na żywo dodano suwak do kontroli powiększenia (zoomu) aparatu. Funkcja jest aktywowana tylko na urządzeniach, które ją wspierają.
- **Ograniczenie i płynność zoomu:** Maksymalne powiększenie zostało ograniczone do 2x dla lepszego doświadczenia użytkownika, a krok suwaka został zmniejszony do `0.1`, aby zapewnić płynniejszą regulację.
- **Lepsze komunikaty dla użytkownika:** Wprowadzono osobne statusy dla inicjalizacji kamery i samego procesu skanowania. Aplikacja teraz wyraźnie informuje, jeśli zoom nie jest wspierany, a także wyświetla bardziej szczegółowe komunikaty o błędach (np. niska jakość obrazu, nie wykryto karty, błąd serwera).
- **Wizualne wskazówki:** Dodano zieloną ramkę ("overlay") pojawiającą się dookoła wykrytej karty w podglądzie na żywo, co daje użytkownikowi natychmiastową informację zwrotną o tym, co analizuje aplikacja.
- **Informacje zwrotne audio:** Dodano efekty dźwiękowe informujące o sukcesie lub porażce skanowania.
- **Naprawa krytycznego błędu:** Usunięto błąd `ReferenceError: useRef is not defined` w komponencie `Pricing.tsx`, który uniemożliwiał renderowanie się całego widoku wyceny na żywo.
- **Stabilizacja środowiska deweloperskiego:** Dodano `healthcheck` do usługi `api` w `docker-compose.yml`, aby rozwiązać problemy z połączeniem na linii frontend-backend podczas uruchamiania aplikacji.

### Usprawnienia interfejsu i funkcjonalności
- **Wizualne efekty rzadkości kart:**
  - Znacząco ulepszono efekty wizualne dla rzadkości kart "Holo", "Rainbow", "Gold", "Amazing Rare", "Shiny", "Full Art" i "Reverse Holo" w pliku `frontend/src/styles.css`, czyniąc je bardziej dynamicznymi i kolorowymi.
  - Dodano nowy, unikalny efekt wizualny "Double Rare" w `frontend/src/styles.css`.
  - Zaktualizowano `frontend/src/views/Pricing.tsx`, aby poprawnie stosować nowy efekt "Double Rare".
- **Poprawa stabilności skanowania na żywo (Mobile):**
  - Wprowadzono mechanizm sprawdzania stabilności po stronie klienta w `frontend/src/hooks/useLivePricingScan.ts`, który zapobiega ciągłemu skanowaniu. System teraz czeka, aż karta zostanie stabilnie utrzymana w kadrze, zanim wywoła analizę, co znacząco poprawia dokładność i niezawodność.
  - Ulepszono komunikaty zwrotne dla użytkownika podczas procesu skanowania na żywo, aby lepiej prowadzić go przez proces.
- **Logo w wersji mobilnej:**
  - Dodano logo firmy (`białe-male.png`) w prawym górnym rogu widoku mobilnego w `frontend/src/App.tsx`, zapewniając jego widoczność bez zakłócania interfejsu użytkownika.
- **Formularz skanowania desktopowego:**
  - Przywrócono i zaimplementowano formularz do edycji wyników skanowania w `frontend/src/views/Scan.tsx`.
  - Formularz zawiera teraz edytowalne pola dla nazwy, numeru i zestawu karty.
  - Zintegrowano pobieranie i wyświetlanie atrybutów Shoper jako rozwijanych list, umożliwiając użytkownikowi przypisywanie odpowiednich atrybutów.
  - Zaktualizowano funkcję `onConfirm` w `frontend/src/views/Scan.tsx` oraz `frontend/src/App.tsx`, aby przesyłać edytowane dane do backendu, co pozwala na zapisanie ręcznych korekt przed finalizacją skanu.

### Moduł Skanowania Kart (Desktop Upload) - Ulepszenia (1 listopada 2025)
- **Ulepszony interfejs użytkownika dla skanowania z pulpitu (`frontend/src/views/Scan.tsx`):**
    - Pole "Zestaw" zmieniono na listę rozwijaną, wypełnioną kategoriami Shoper.
    - Pola formularza są teraz ułożone w responsywnym układzie dwukolumnowym.
    - Dodano pole tylko do odczytu do wyświetlania wygenerowanego kodu produktu (`POKE-SKRÓT_ZESPOŁU-NUMER-SUFIKS_WARIANTU`).
    - Dodano podgląd obrazu TCGGO, który zostanie użyty do wystawienia produktu w sklepie, wyświetlany obok skanu użytkownika.
- **Poprawione automatyczne wypełnianie danych:**
    - Backend (endpoint `/scan` w `backend/app/main.py`) teraz niezawodnie pobiera i zwraca warianty cen (w tym szacowane ceny Holo/Reverse Holo) i automatycznie wypełnia pole ceny w interfejsie użytkownika.
    - Backend próbuje mapować wykryte właściwości karty (rzadkość, energia, typ itp.) na atrybuty Shoper, zapewniając automatyczne sugestie dla list rozwijanych atrybutów.
    - Frontend automatycznie ustawia wartości domyślne dla "Języka" (Language) na "Angielski" i "Jakości" (Condition) na "Near Mint".
- **Naprawiony przepływ pracy i użyteczność:**
    - Przycisk "Zapisz i dalej" (Save and continue) jest teraz poprawnie włączony, gdy podstawowe pola formularza (Nazwa, Numer, Zestaw) są wypełnione, odblokowując przepływ pracy użytkownika.
    - Backend zapewnia priorytetowe traktowanie obrazu TCGGO przy publikowaniu produktu.

### Zmiany z 2 listopada 2025 (Dzisiejsze prace)

-   **Refaktoryzacja UI skanowania (Frontend):**
    -   Ulepszono układ formularza skanowania desktopowego (dwukolumnowy, pogrupowane pola ceny/przyciski).
    -   Zmieniono główny przycisk formularza, aby otwierał panel atrybutów.
    -   Poprawiono użycie `class` na `className` w `Scan.tsx`.
    -   Skonsolidowano hooki `useEffect` w `Scan.tsx`, aby zapobiec warunkom wyścigu i migotaniu formularza.
    -   Przywrócono widok kamery na żywo dla urządzeń mobilnych z warunkowym renderowaniem (`isAndroid`).

-   **Poprawka backendu (Pobieranie obrazu/zestawu z TCGGO):**
    -   Zapewniono poprawne wypełnianie słownika `fused` wzbogaconymi danymi (nazwa, zestaw, numer, rzadkość) od dostawcy TCG w endpointcie `/scan`.
    -   Zaktualizowano obiekt `scan` w bazie danych o dokładniejsze dane zestawu i numeru od dostawcy.

-   **Przywracanie danych duplikatów:**
    -   Zaimplementowano pełne przywracanie danych dla zduplikowanych kart we frontendzie (`Scan.tsx`), włączając cenę i atrybuty (wykorzystując `/api/shoper/map_attributes`).
    -   Zmieniono kolor powiadomienia o duplikacie na zielony.

-   **Usunięcie funkcji: "Skanowanie kart" (Skanowanie do magazynu):**
    -   Usunięto zakładkę "Skanowanie kart" z paska bocznego na desktopie (`Sidebar.tsx`).
    -   Usunięto zakładkę "scan" z mobilnego `TabBar`.
    -   Usunięto wszystkie powiązane stany, hooki (`useLiveScan`), funkcje i logikę renderowania z `App.tsx`.

-   **Dodanie funkcji: "Statystyki" na urządzeniach mobilnych:**
    -   Dodano zakładkę "Statystyki" (`dashboard`) do mobilnego `TabBar`.

-   **Dodanie funkcji: Powiadomienia Push o nowych zamówieniach (Android):**
    -   **Frontend:**
        -   Dodano nasłuchiwacz zdarzeń `push` do service workera (`sw.js`) do obsługi i wyświetlania przychodzących powiadomień.
        -   Dodano logikę do `App.tsx` w celu żądania pozwolenia na powiadomienia i wysyłania subskrypcji push do backendu.
    -   **Backend:**
        -   Dodano `pywebpush` do `requirements.txt`.
        -   Utworzono model `PushSubscription` w `db.py`.
        -   Dodano endpoint `/notifications/subscribe` w `main.py` do przechowywania subskrypcji.
        -   Dodano zadanie w tle `check_for_new_orders` w `main.py` do okresowego sprawdzania nowych zamówień Shoper i wysyłania powiadomień push do wszystkich subskrybowanych użytkowników.
        -   Dodano klucze VAPID do `settings.py` i `.env.example`.
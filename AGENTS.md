# Wytyczne dla agenta (AGENTS.md)

Ten plik służy jako stały kontekst pracy dla agenta w tym repozytorium. Zasady obowiązują w całym projekcie (root scope).

## Projekt w skrócie
- Backend: FastAPI (Python 3.11) — katalog `backend/app`
- Frontend: React + Vite — katalog `frontend`
- Uruchamianie: Docker Compose — usługi `api` (port 8000) i `frontend` (port 5173)
- Baza danych: SQLite — plik `storage/app.db` (wolumen montowany do kontenera `api`)

## Jak uruchamiać
- Całość: `docker compose up -d --build`
- Osobno (PowerShell używa `;` zamiast `&&`):
  - `docker compose build api; docker compose up -d api`
  - `docker compose build frontend; docker compose up -d frontend`
- Dostęp:
  - Frontend: `http://<IP_SERWERA>:5173` (w dev HTTPS może być włączone w Vite)
  - API health: `http://<IP_SERWERA>:8000/health`
  - Statyczne uploady: `http://<IP_SERWERA>:8000/uploads/<plik>`
- ADB/Podgląd kamery na telefonie (opcjonalnie): patrz `README.md` (sekcja o `adb reverse`).

## Zmienne środowiska (kluczowe)
- Definiowane w `docker-compose.yml` i `backend/.env[.example]`
- Najważniejsze:
  - `OPENAI_API_KEY` — opcjonalny klucz do OCR/vision (fallback działa bez)
  - `SHOPER_BASE_URL`, `SHOPER_ACCESS_TOKEN` — integracja z Shoper (pobieranie/publikacja)
  - `EUR_PLN_RATE`, `PRICE_MULTIPLIER` — parametry wyceny
  - `PUBLISH_DRY_RUN` — publikacja bez tworzenia produktów
  - `SET_CATEGORY_MAP` — JSON mapujący nazwę seta → `category_id` w Shoper

## Konwencje — backend (FastAPI)
- Pydantic v2: ustawienia w `backend/app/settings.py` (używaj `Field(..., alias=...)`, `extra="ignore"`).
- Endpointy z I/O implementuj asynchronicznie; używaj `httpx.AsyncClient`.
- Obsługa błędów: zwracaj `JSONResponse` z kodem HTTP i prostym `{ "error": ... }`.
- Baza: SQLAlchemy + SQLite; inicjalizacja schematu w `init_db()` (migracje lekkie, bez zewnętrznych narzędzi).
- Uploady: trzymaj w `settings.upload_dir` (domyślnie `/app/storage/uploads`), serwowane pod `/uploads`.
- Integracje:
  - Shoper: klient i publikacja w `backend/app/shoper.py`; cache taksonomii z TTL; obrazy opcjonalnie przez `SHOPER_IMAGE_BASE`.
  - Provider kart: RapidAPI (domyślnie `pokemon-tcg-api.p.rapidapi.com`) z fallbackiem do `api.pokemontcg.io`.
- Jakość skanów i duplikaty: progi w `settings` (`MIN_QUALITY_*`); porównywanie odcisków w `analysis/fingerprint.py`.

## Konwencje — frontend (Vite)
- TypeScript + Vite; opcjonalne `VITE_API_BASE_URL` (domyślnie proxy do `api:8000` przez `API_PROXY_TARGET`).
- W dev HTTPS może być włączony przez zmienne `HTTPS`, `SSL_CRT_FILE`, `SSL_KEY_FILE` i certyfikaty w `frontend/certs/`.

## Styl i zasady zmian dla agenta
- Rób zmiany minimalnie inwazyjne; zachowuj istniejące nazwy/konwencje.
- Dodając ustawienia/feature’y, modyfikuj spójnie:
  - `backend/app/settings.py` (nowe pola + aliasy env)
  - `docker-compose.yml` (zmienne) i `backend/.env.example`
  - Dokumentacja: aktualizuj `README.md`/`README-LOCAL.md` jeśli zachowanie/wymagania się zmieniają
- Staraj się nie dotykać katalogu `tests/` (zawiera legacy testy niepowiązane z bieżącym MVP), chyba że zmiana jest bezpośrednio wymagana.
- Nie dodawaj plików licencyjnych ani nagłówków; nie zmieniaj formatowania w całym repo bez potrzeby.

## Przydatne endpointy API (skrót)
- `GET /health` — status
- `GET /config` — progi jakości dla UI
- `POST /scan/probe` — szybka ocena kadru (overlay + quality)
- `POST /scan/commit` — zapis skanu + kandydaci
- `POST /pricing/estimate` — wycena (EUR→PLN + mnożnik)
- `GET /shoper/attributes`, `GET /shoper/categories` — taksonomia (cache + fallback `ids_dump.json`)
- `POST /sessions/start`, `GET /sessions/{id}/summary`, `POST /sessions/{id}/publish` — sesje i publikacja batchowa

## Struktura katalogów (ważne ścieżki)
- `backend/app/main.py` — główne endpointy FastAPI
- `backend/app/settings.py` — konfiguracja i zmienne środowiskowe
- `backend/app/providers.py` — provider kart (RapidAPI + fallback)
- `backend/app/pricing.py` — logika wyceny
- `backend/app/shoper.py` — integracja Shoper (klient + publikacja)
- `storage/` — baza SQLite i uploady (wolumen dla kontenera `api`)
- `frontend/` — aplikacja Vite (dev SSL wspierany)

## Uruchamianie i debug (polecenia)
- Cały stack: `docker compose up -d --build`
- Restart tylko API: `docker compose up -d --build api`
- Logi API: `docker compose logs -f api`
- Logi frontend: `docker compose logs -f frontend`

## Uwagi dodatkowe
- Po starcie API wykona `init_db()` oraz opcjonalnie `auto sync` produktów z Shoper (gdy klucze ustawione).
- Jeśli schemat SQLite wymaga resetu w dev, usuń `storage/app.db` (utrata historii) i uruchom ponownie.

## Dodatkowe zasady (commity, branchowanie, styl, testy)
- Commity: Conventional Commits w języku angielskim.
  - Format: `type(scope): short description`
  - Typy: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
  - Scope przykłady: `api`, `frontend`, `docs`, `infra` (np. `feat(api): add pricing variants endpoint`).
  - Opis w czasie teraźniejszym, max ~72 znaki w tytule; szerszy opis w treści.
- Branchowanie: lekki trunk-based flow.
  - Główna gałąź: `main`.
  - Feature: `feat/<krotki-opis>`; poprawki: `fix/<krotki-opis>`; hotfix: `hotfix/<krotki-opis>`.
  - PR-y małe i skupione; przy zmianach UI dodaj zrzuty ekranu w opisie PR.
- Styl kodu — Python (backend):
  - PEP 8, typowanie obowiązkowe w nowym kodzie; długość linii 100–120.
  - Preferuj async I/O (`httpx.AsyncClient`), nie blokuj event-loopa.
  - Konfiguracja w `settings.py` (Pydantic v2, aliasy env); brak twardych walidacji „extras”.
  - Błędy HTTP: zwracaj `JSONResponse` z prostym `{"error": "..."}` i adekwatnym statusem.
  - Zmiany w konfiguracji zawsze synchronizuj w: `settings.py` → `docker-compose.yml` → `backend/.env.example` → dokumentacja.
- Styl kodu — Frontend (Vite/TS):
  - TypeScript z typami jawnie w publicznym API komponentów/hooków.
  - Komponenty w `src/`, logika w hookach/utilach; unikaj eksportów domyślnych.
  - Preferuj Prettier/ESLint domyślne (nie wprowadzaj nowych narzędzi bez potrzeby) — zachowuj spójny styl i krótsze pliki.
- Testy i weryfikacja:
  - Nie modyfikuj legacy testów w `tests/`, chyba że to bezpośrednia konsekwencja zmiany wymagań.
  - Dla nowej logiki backendu dodaj małe testy jednostkowe w obrębie nowego modułu (jeśli istnieje już miejsce/pattern).
  - Uruchamianie lokalne: `pytest -q` dla backendu; `tsc --noEmit` dla TS, jeśli dostępne.
- Migracje/DB:
  - Bez zewnętrznego narzędzia migracji; preferuj bezpieczne `ALTER TABLE` w `init_db()` (dodawanie kolumn).
  - Zmiany łamiące: opisz kroki w `README-LOCAL.md` (np. ręczne usunięcie `storage/app.db` w dev).
- Sekrety i konfiguracja:
  - Nie commituj `.env`; aktualizuj `backend/.env.example` i opisy zmiennych w README.
  - Nowe klucze środowiska muszą mieć sensowne domyślne w docker-compose i aliasy w `settings.py`.


# Agent Guidelines

## Commands
- **Single Test:** `pytest tests/test_filename.py::test_function_name` (or `-k "pattern"`)
- **Run All Tests:** `pytest -q`
- **Frontend Check:** `cd frontend && tsc --noEmit` (Type check only)
- **Full Build:** `docker compose up -d --build` (API: 8000, UI: 5173)

## Code Standards
- **Python:** FastAPI, Pydantic v2, SQLAlchemy. Use `str | None` for optionals. `snake_case`.
- **React:** TypeScript, Vite, Tailwind. Use functional components & named exports. `camelCase`.
- **Imports:** Verify library availability in `backend/requirements.txt` or `package.json` before use.
- **Config:** Manage env vars via `backend/app/settings.py` (Pydantic).
- **Async:** Use `async def` and `httpx.AsyncClient` for I/O in backend.

## Protocols
- **Paths:** USE ABSOLUTE PATHS for all file operations (Root: `/home/bogus/Skrypty/kartoteka-2.0`).
- **Testing:** Verify changes with existing tests. Do not modify `tests/` unless necessary.
- **Safety:** Read files before editing. Check for side effects.

## Key Logic (Do Not Break)
- **Card Analysis:** Uses "Combined Intelligence" (OpenAI Vision + Symbol Matcher + OCR). See `backend/app/analysis/pipeline.py`.
- **Shoper Sync:** Category tree creation (`POST /shoper/create-category-tree`) uses `shoper_sync.py` with deduplication and rich content generation.
- **Batch Scanning:** Warehouse codes are allocated per-batch (`get_next_free_location_for_batch`).
- **Mobile:** Camera requires HTTPS context.

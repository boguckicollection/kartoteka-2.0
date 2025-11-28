# Agent Guidelines (AGENTS.md)

## Build/Run/Test Commands
**Docker (primary):**
- Build & run: `docker compose up -d --build` (API: `:8000`, Frontend: `:5173`)
- Rebuild API only: `docker compose up -d --build api`
- Rebuild frontend: `docker compose up -d --build frontend`
- Logs: `docker compose logs -f api` / `docker compose logs -f frontend`

**Local testing (Python):**
- Run all tests: `pytest -q`
- Single test: `pytest tests/test_filename.py::test_function_name -v`
- With markers: `pytest -m integration -v`

**Frontend (dev):**
- Dev server: `cd frontend && npm run dev` (starts Vite on `:5173`)
- Build: `npm run build`
- Type check: `tsc --noEmit` (if available locally)

## Code Style — Backend (Python/FastAPI)
**Imports:** Group stdlib, third-party, local (PEP 8); prefer explicit imports
**Types:** Use type hints in all new code; prefer `str | None` over `Optional[str]` (Python 3.10+)
**Async:** Use `async def` for I/O endpoints; `httpx.AsyncClient` for external calls; never block event loop
**Naming:** `snake_case` for functions/variables; `PascalCase` for classes; descriptive names (e.g., `get_shoper_categories`)
**Line length:** 100–120 chars
**Settings:** All config in `backend/app/settings.py` using Pydantic v2 with `Field(..., alias="ENV_VAR")`. When adding settings, sync: `settings.py` → `docker-compose.yml` → `backend/.env.example` → docs
**Error handling:** Return `JSONResponse({"error": "message"}, status_code=4xx/5xx)`; log unexpected errors
**Database:** SQLAlchemy + SQLite; schema changes via `init_db()` (no external migrations); breaking changes documented in `README-LOCAL.md`

## Code Style — Frontend (TypeScript/React/Vite)
**Imports:** React hooks first, components, types, utils; group by domain
**Types:** Explicit types for props/state/returns; define interfaces in `types.ts` or inline
**Naming:** `camelCase` for variables/functions; `PascalCase` for components; prefix hooks with `use`
**Components:** Named exports (not `export default`); keep files focused (<200 lines when practical)
**State:** Prefer `useState`/`useEffect` hooks; lift state minimally; use `useMemo` for expensive computations
**API calls:** Use `apiBase` from env (`VITE_API_BASE_URL` or `/api` proxy); handle loading/error states
**Formatting:** Follow existing indentation (2 spaces); no trailing commas inconsistency

## Project Context
- **Stack:** FastAPI (Python 3.11) backend, React+Vite frontend, SQLite database
- **Structure:** `backend/app/` (API), `frontend/src/` (UI), `storage/` (DB+uploads), `tests/` (legacy—avoid touching)
- **Key files:** `backend/app/main.py` (endpoints), `backend/app/settings.py` (config), `backend/app/shoper.py` (integrations)
- **Env vars:** Defined in `docker-compose.yml` and `backend/.env.example`; key ones: `SHOPER_BASE_URL`, `SHOPER_ACCESS_TOKEN`, `EUR_PLN_RATE`, `MIN_QUALITY_*`

## Commit/Branch Conventions
**Commits:** Conventional Commits in English: `type(scope): description` (e.g., `feat(api): add price update endpoint`)
- Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- Keep under 72 chars; use present tense; focus on "why" not "what"
**Branches:** `main` trunk; feature branches: `feat/<short-desc>`, fixes: `fix/<short-desc>`, hotfixes: `hotfix/<short-desc>`

## General Rules for Agents
- Make minimal invasive changes; preserve existing naming/patterns
- Don't modify `tests/` unless directly required by changes
- Don't add license headers or reformat entire files without cause
- When adding features: update settings → env files → docs consistently
- Use type hints, handle errors gracefully, test locally before commit


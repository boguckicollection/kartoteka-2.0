from __future__ import annotations

from typing import List, Optional
import httpx
from rapidfuzz import fuzz

from .schemas import Candidate, DetectedData
from .settings import settings


class CardProvider:
    async def search(self, detected: DetectedData) -> List[Candidate]:  # pragma: no cover
        raise NotImplementedError
    async def details(self, card_id: str) -> dict:  # pragma: no cover
        """Fetch detailed info (including prices) for a given provider-specific card id."""
        raise NotImplementedError


class PokemonTCGProvider(CardProvider):
    """Basic integration with pokemontcg.io v2 as a working fallback provider.

    This is used until a specific TCGGO API is configured.
    """

    base_url = "https://api.pokemontcg.io/v2"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.tcggo_api_key

    async def search(self, detected: DetectedData) -> List[Candidate]:
        if not detected.name:
            return []

        # Build query with optional filters
        query_parts = [f"name:{detected.name}"]
        if detected.number:
            query_parts.append(f"number:{detected.number}")
        q = " ".join(query_parts)

        headers = {}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{self.base_url}/cards", params={"q": q, "pageSize": 20}, headers=headers)
            r.raise_for_status()
            data = r.json()

        cards = data.get("data", [])
        results: List[Candidate] = []
        for c in cards:
            name = c.get("name")
            set_info = c.get("set", {})
            set_name = set_info.get("name")
            set_code = set_info.get("id")
            number = c.get("number")
            images = c.get("images", {})
            image_url = images.get("small") or images.get("large")

            # Score basic similarity
            score = 0.0
            if detected.name and name:
                score = fuzz.token_set_ratio(detected.name, name) / 100.0
            # Boost for exact number
            if detected.number and number and str(detected.number) == str(number):
                score += 0.15
            # Boost for set name/code hints
            if detected.set and set_name and detected.set.lower() in set_name.lower():
                score += 0.1
            if detected.set_code and set_code and str(detected.set_code).lower() == str(set_code).lower():
                score += 0.1
            score = max(0.0, min(1.0, score))

            results.append(
                Candidate(
                    id=c.get("id"),
                    name=name,
                    set=set_name,
                    set_code=set_code,
                    number=number,
                    rarity=c.get("rarity"),
                    image=image_url,
                    score=score,
                )
            )

        # Sort by number exact match first, then score; keep top 8
        def _key(cand: Candidate):
            exact = 1 if (detected.number and cand.number and str(detected.number) == str(cand.number)) else 0
            return (exact, cand.score)
        results.sort(key=_key, reverse=True)
        return results[:8]

    async def details(self, card_id: str) -> dict:
        # Public details endpoint
        headers = {}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(f"{self.base_url}/cards/{card_id}", headers=headers)
            r.raise_for_status()
            data = r.json()
        # Normalize a bit
        return data.get("data") or data


class RapidAPITCGGOProvider(CardProvider):
    """RapidAPI provider for tcggopro / pokemon-tcg-api.

    Config via settings: rapidapi_key, rapidapi_host, tcggo_base_url, tcggo_search_path.
    """

    def __init__(self):
        self.key = settings.rapidapi_key
        self.host = settings.rapidapi_host

        def _normalize_base(u: str | None) -> str:
            if not u:
                return ""
            s = str(u).strip()
            if not (s.startswith("http://") or s.startswith("https://")):
                s = "https://" + s.lstrip("/")
            return s.rstrip("/")

        def _normalize_path(p: str | None) -> str:
            if not p:
                return ""
            s = str(p).strip()
            if not s.startswith("/"):
                s = "/" + s
            return s

        self.base_url = _normalize_base(settings.tcggo_base_url)
        self.search_path = _normalize_path(settings.tcggo_search_path)
        self.search_search_path = _normalize_path(settings.tcggo_search_search_path)

    async def search(self, detected: DetectedData) -> List[Candidate]:
        if not detected.name:
            return []

        headers = {
            "x-rapidapi-key": self.key or "",
            "x-rapidapi-host": self.host,
        }
        async with httpx.AsyncClient(timeout=12) as client:
            # 1. First attempt: Precise search with name and number
            parts1 = [str(detected.name or '').strip(), str(detected.number or '').strip()]
            if detected.set:
                parts1.append(f"EPISODE:{str(detected.set).strip()}")
            search_q1 = " ".join([p for p in parts1 if p]).strip()
            
            print(f"DEBUG: TCGGO search query (attempt 1): '{search_q1}'")
            print(f"DEBUG: Detected data - name: '{detected.name}', number: '{detected.number}', set: '{detected.set}'")
            
            payload = None
            if search_q1:
                r1 = await client.get(
                    f"{self.base_url}{self.search_search_path}",
                    params={"search": search_q1, "sort": settings.tcggo_sort},
                    headers=headers,
                )
                r1.raise_for_status()
                payload = r1.json()
                print(f"DEBUG: TCGGO returned {len(payload) if isinstance(payload, list) else len(payload.get('data', []))} results")

            # Extract cards from payload
            if isinstance(payload, list):
                cards = payload
            elif isinstance(payload, dict):
                cards = payload.get("data") or payload.get("cards") or payload.get("results") or []
            else:
                cards = []

            # 2. Second attempt: If first search yielded no results, try a broader search with just the name
            if not cards and detected.name:
                search_q2 = str(detected.name).strip()
                print(f"DEBUG: First search returned no results, trying broader search: '{search_q2}'")
                r2 = await client.get(
                    f"{self.base_url}{self.search_search_path}",
                    params={"search": search_q2, "sort": settings.tcggo_sort},
                    headers=headers,
                )
                r2.raise_for_status()
                payload = r2.json()
                print(f"DEBUG: TCGGO broader search returned {len(payload) if isinstance(payload, list) else len(payload.get('data', []))} results")
                # Re-extract cards
                if isinstance(payload, list):
                    cards = payload
                elif isinstance(payload, dict):
                    cards = payload.get("data") or payload.get("cards") or payload.get("results") or []
                else:
                    cards = []

        # Try multiple shapes: {data: [...]}, {cards: [...]}, {results: [...]}, or top-level list
        if isinstance(payload, list):
            cards = payload
        elif isinstance(payload, dict):
            cards = payload.get("data") or payload.get("cards") or payload.get("results") or []
        else:
            cards = []

        results: List[Candidate] = []
        for c in cards or []:
            if not isinstance(c, dict):
                # Sometimes RapidAPI returns a list of IDs or strings; skip safely
                continue
            name = c.get("name")
            set_info = c.get("set") or {}
            set_name = set_info.get("name") or c.get("setName")
            set_code = set_info.get("id") or set_info.get("code") or c.get("setCode")
            number = c.get("number")
            images = c.get("images") or {}
            image_url = images.get("small") or images.get("large") or c.get("imageUrl")

            # Score basic similarity
            score = 0.0
            if detected.name and name:
                score = fuzz.token_set_ratio(detected.name, name) / 100.0
            
            # Boost for exact number match
            if detected.number and number and str(detected.number) == str(number):
                score += 0.3  # Increased boost for number match
            
            # Boost for set name hints
            if detected.set and set_name:
                # Check for partial match (e.g. "Scarlet & Violet" in "Scarlet & Violet - Paldea Evolved")
                if detected.set.lower() in set_name.lower() or set_name.lower() in detected.set.lower():
                    score += 0.2
            
            # Boost for set code hints (Strong signal)
            if detected.set_code and set_code and str(detected.set_code).lower() == str(set_code).lower():
                score += 0.3

            # Penalize if number exists in detected but doesn't match candidate
            if detected.number and number and str(detected.number) != str(number):
                score -= 0.2

            score = max(0.0, min(1.0, score))

            cid = c.get("id") or c.get("tcgid") or c.get("slug") or name or "unknown"
            results.append(
                Candidate(
                    id=str(cid),
                    name=name or "",
                    set=set_name,
                    set_code=set_code,
                    number=number,
                    rarity=c.get("rarity"),
                    image=image_url,
                    score=score,
                )
            )

        # Prefer exact number match first, then score
        def _key(c: Candidate):
            exact = 1 if (detected.number and c.number and str(detected.number) == str(c.number)) else 0
            return (exact, c.score)
        results.sort(key=_key, reverse=True)
        return results[:8]

    async def details(self, card_id: str) -> dict:
        headers = {
            "x-rapidapi-key": self.key or "",
            "x-rapidapi-host": self.host,
        }
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(f"{self.base_url}{self.search_path}/{card_id}", headers=headers)
            r.raise_for_status()
            payload = r.json()
        # Accept direct or wrapped payloads
        return payload.get("data") or payload.get("card") or payload


def get_provider() -> CardProvider:
    # Prefer RapidAPI provider if key is set
    if settings.rapidapi_key:
        return RapidAPITCGGOProvider()
    return PokemonTCGProvider()

from __future__ import annotations

from typing import List, Optional
import json
import os
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
    
    _set_abbr_map = None

    def _load_set_map(self):
        if self.__class__._set_abbr_map is not None:
            return

        mapping = {}
        try:
            # Check likely locations
            # 1. Current working directory
            # 2. Relative to this file (backend/app/../../tcg_sets.json)
            possible_paths = [
                "/app/tcg_sets.json",
                "tcg_sets.json",
                os.path.join(os.path.dirname(__file__), "../../tcg_sets.json"),
            ]
            
            found_path = None
            for p in possible_paths:
                if os.path.exists(p):
                    found_path = p
                    break
            
            if found_path:
                with open(found_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for group_sets in data.values():
                        for s in group_sets:
                            if "name" in s and "abbr" in s:
                                mapping[s["name"]] = s["abbr"]
                # print(f"DEBUG: Loaded {len(mapping)} set abbreviations from {found_path}")
            else:
                print(f"ERROR: tcg_sets.json not found for TCGGO provider. Checked paths: {possible_paths}")
        except Exception as e:
            print(f"ERROR: Failed to load tcg_sets.json: {e}")
        
        self.__class__._set_abbr_map = mapping

    def __init__(self):
        self._load_set_map()
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

        # Prepare set information
        search_set = detected.set
        # 1. Handle "null" string
        if search_set and str(search_set).strip().lower() in ("null", "none"):
            search_set = None

        if search_set and self._set_abbr_map and search_set in self._set_abbr_map:
            abbr = self._set_abbr_map[search_set]
            print(f"DEBUG: Normalized set '{search_set}' to '{abbr}'")
            search_set = abbr

        # Define search tiers
        attempts = []
        
        # Attempt 1: Specific (Name + Number + EPISODE:Set)
        if search_set:
            parts = [str(detected.name).strip()]
            if detected.number:
                parts.append(str(detected.number).strip())
            parts.append(f"EPISODE:{str(search_set).strip()}")
            attempts.append(("Attempt 1 (Specific)", " ".join(parts)))

        # Attempt 2: Name + Number (without Set)
        if detected.number:
            parts = [str(detected.name).strip(), str(detected.number).strip()]
            attempts.append(("Attempt 2 (Name + Number)", " ".join(parts)))

        # Attempt 3: Broad (Name only)
        attempts.append(("Attempt 3 (Broad)", str(detected.name).strip()))

        cards = []
        
        async with httpx.AsyncClient(timeout=12) as client:
            for label, query in attempts:
                if not query:
                    continue
                    
                print(f"DEBUG: Search {label}: '{query}'")
                try:
                    r = await client.get(
                        f"{self.base_url}{self.search_search_path}",
                        params={"search": query, "sort": settings.tcggo_sort},
                        headers=headers,
                    )
                    r.raise_for_status()
                    payload = r.json()
                except Exception as e:
                    print(f"DEBUG: Search {label} failed: {e}")
                    continue

                # Extract cards
                current_cards = []
                if isinstance(payload, list):
                    current_cards = payload
                elif isinstance(payload, dict):
                    current_cards = payload.get("data") or payload.get("cards") or payload.get("results") or []
                
                if current_cards:
                    print(f"DEBUG: Search {label} returned {len(current_cards)} results")
                    cards = current_cards
                    break
                else:
                    print(f"DEBUG: Search {label} returned 0 results")

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
            image_url = images.get("small") or images.get("large") or c.get("imageUrl") or c.get("image")

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

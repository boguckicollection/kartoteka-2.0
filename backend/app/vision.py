import base64
from typing import Optional

from .settings import settings


def _read_b64(path: str) -> str:
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def extract_fields_with_openai(image_path: str) -> dict:
    """Call OpenAI Vision to extract fields from the card image.
    Returns a dict with keys: name, set, set_code, number, language, variant, condition, rarity, energy.
    If OPENAI_API_KEY not set, returns a minimal heuristic fallback.
    """
    if not settings.openai_api_key:
        # Fallback: derive name from filename only
        from pathlib import Path
        stem = Path(image_path).stem.replace('_', ' ').strip()
        return {
            'name': stem or None,
            'set': None,
            'set_code': None,
            'number': None,
            'language': None,
            'variant': None,
            'condition': None,
            'rarity': None,
            'energy': None,
        }

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        b64 = _read_b64(image_path)
        prompt = (
            "You are an expert at analyzing Pokémon Trading Card Game cards. "
            "Extract the following fields from the card image and return ONLY valid JSON:\n\n"
            
            "IMPORTANT INSTRUCTIONS:\n"
            "1. **Card Number & Set Symbol**: Look in the BOTTOM RIGHT corner of the card. "
            "Older cards (pre-2003) often show the card number and set symbol ONLY in this corner. "
            "The number format is usually 'XX/YYY' or just 'XX'. The set symbol is a small icon next to the number.\n"
            
            "2. **Set Identification**: If you see a set symbol (icon) in the bottom right:\n"
            "   - Circle with '1' = Base Set (set_code: 'base1')\n"
            "   - Jungle leaf symbol = Jungle (set_code: 'jungle')\n"
            "   - Fossil shell = Fossil (set_code: 'fossil')\n"
            "   - Team Rocket 'R' = Team Rocket (set_code: 'base5')\n"
            "   - Other symbols: try to identify the set name from the symbol\n"
            
            "3. **Card Name**: Located at the top of the card, above the image.\n"
            
            "4. **Energy Type**: Visible from the card's type icon or attack costs. "
            "Values: Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Fairy, Dragon, Colorless.\n"
            
            "5. **Rarity**: Look for a symbol in the bottom right corner after the card number:\n"
            "   - Circle = Common\n"
            "   - Diamond = Uncommon\n"
            "   - Star = Rare\n"
            "   - Other symbols may indicate special rarities\n"
            
            "6. **Language**: Detect from visible text (English, Polish, German, French, Japanese, etc.)\n"
            
            "7. **Variant/Finish**: Holo, Reverse Holo, Normal, Full Art, etc.\n"
            
            "8. **Condition**: Assess visible wear (Near Mint, Light Played, etc.)\n\n"
            
            "Return JSON with these exact keys: name, set, set_code, number, language, variant, condition, rarity, energy. "
            "Use null for unknown values. Respond with JSON only, no explanation."
        )

        # Using Chat Completions with vision (gpt-4o-mini)
        chat = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                }
            ],
            temperature=0.2,
        )

        import json

        text = chat.choices[0].message.content or "{}"
        # Attempt to extract JSON if model wrapped it
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]
        data = json.loads(text)

        def _scalar(v):
            if v is None:
                return None
            # If model returns lists (e.g. multiple energies), pick the first non-empty
            if isinstance(v, (list, tuple)):
                for item in v:
                    if item is None:
                        continue
                    s = str(item).strip()
                    if s:
                        return s
                return None
            # Otherwise stringify scalars
            s = str(v).strip()
            return s or None

        return {
            'name': _scalar(data.get('name')),
            'set': _scalar(data.get('set')),
            'set_code': _scalar(data.get('set_code')),
            'number': _scalar(data.get('number')),
            'language': _scalar(data.get('language')),
            'variant': _scalar(data.get('variant')),
            'condition': _scalar(data.get('condition')),
            'rarity': _scalar(data.get('rarity')),
            'energy': _scalar(data.get('energy')),
        }
    except Exception:
        # Silent fallback
        from pathlib import Path
        stem = Path(image_path).stem.replace('_', ' ').strip()
        return {
            'name': stem or None,
            'set': None,
            'set_code': None,
            'number': None,
            'language': None,
            'variant': None,
            'condition': None,
            'rarity': None,
            'energy': None,
        }

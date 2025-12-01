import base64
from typing import Optional

from .settings import settings


def _read_b64(path: str) -> str:
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


def _normalize_card_number(number_str: str | None) -> str | None:
    """Extract just the card number, removing total count after slash."""
    if not number_str:
        return None
    
    num = str(number_str).strip()
    
    # If contains slash, take only the part before it
    if '/' in num:
        num = num.split('/')[0].strip()
    
    return num if num else None


def _call_openai_vision(b64: str) -> dict:
    """Helper to call OpenAI Vision with a base64 image string."""
    from openai import OpenAI
    import json

    client = OpenAI(api_key=settings.openai_api_key)

    # Optimization: Resize image if too large before sending to OpenAI
    try:
        from PIL import Image
        import io
        
        # Decode
        img_data = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_data))
        
        # Resize if needed (max 1000px long edge)
        max_dim = 1000
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Re-encode to JPEG
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    except Exception as e:
        print(f"Image resize optimization failed: {e}")
        # Continue with original b64 if resize fails

    prompt = (
        "You are an expert at analyzing Pokémon Trading Card Game cards. "
        "Your task is to identify the card name, card number, set name, set code, rarity, energy type, and card type.\n\n"
        
        "IMPORTANT INSTRUCTIONS:\n"
        "1. **Card Name**: Located at the top of the card.\n"
        "2. **Card Number**: Look in the BOTTOM corner. Format is 'XX/YYY' or 'XX'. Return ONLY the numerator (XX).\n"
        "3. **Set Name**: Look for the full name of the expansion/set (e.g., 'Scarlet & Violet', 'Lost Origin').\n"
        "4. **Set Code**: Look for the alphanumeric set code usually near the card number (e.g., 'SV1', 'SWSH11', 'OBF').\n"
        "5. **Rarity**: Identify the rarity symbol (e.g., Circle for Common, Diamond for Uncommon, Star for Rare).\n"
        "6. **Energy Type**: Determine the card's energy type (e.g., Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Fairy, Dragon, Colorless).\n"
        "7. **Card Type**: Specify if it's a 'Pokemon', 'Trainer', or 'Energy' card.\n\n"
        
        "Return JSON with these exact keys: name, number, set_name, set_code, rarity, energy, card_type. "
        "Use null for unknown values. Respond with JSON only."
    )

    chat = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            }
        ],
        temperature=0.2,
    )

    text = chat.choices[0].message.content or "{}"
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start : end + 1]
    data = json.loads(text)

    def _scalar(v):
        if v is None: return None
        if isinstance(v, (list, tuple)):
            for item in v:
                if item is None: continue
                s = str(item).strip()
                if s: return s
            return None
        s = str(v).strip()
        return s or None

    return {
        'name': _scalar(data.get('name')),
        'set': _scalar(data.get('set_name')) or _scalar(data.get('set')),
        'number': _normalize_card_number(_scalar(data.get('number'))),
        'rarity': _scalar(data.get('rarity')),
        'energy': _scalar(data.get('energy')),
        'card_type': _scalar(data.get('card_type')),
        'set_code': _scalar(data.get('set_code')),
        'language': None,
        'variant': None,
        'condition': None,
    }


def extract_fields_with_openai_bytes(image_bytes: bytes) -> dict:
    """Extract fields from card using raw image bytes."""
    if not settings.openai_api_key:
        return {
            'name': None, 'set': None, 'set_code': None, 'number': None,
            'language': None, 'variant': None, 'condition': None, 'rarity': None, 'energy': None
        }

    try:
        import base64
        b64 = base64.b64encode(image_bytes).decode('ascii')
        return _call_openai_vision(b64)
    except Exception as e:
        print(f"OpenAI Vision (bytes) failed: {e}")
        return {
            'name': None, 'set': None, 'set_code': None, 'number': None,
            'language': None, 'variant': None, 'condition': None, 'rarity': None, 'energy': None
        }


def extract_fields_with_openai(image_path: str) -> dict:
    """Extract fields from card using file path."""
    if not settings.openai_api_key:
        from pathlib import Path
        stem = Path(image_path).stem.replace('_', ' ').strip()
        return {
            'name': stem or None, 'set': None, 'set_code': None, 'number': None,
            'language': None, 'variant': None, 'condition': None, 'rarity': None, 'energy': None
        }

    try:
        b64 = _read_b64(image_path)
        return _call_openai_vision(b64)
    except Exception as e:
        print(f"OpenAI Vision (file) failed: {e}")
        # Fallback
        from pathlib import Path
        stem = Path(image_path).stem.replace('_', ' ').strip()
        return {
            'name': stem or None, 'set': None, 'set_code': None, 'number': None,
            'language': None, 'variant': None, 'condition': None, 'rarity': None, 'energy': None
        }

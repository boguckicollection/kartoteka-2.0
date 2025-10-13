import importlib
import sys
from pathlib import Path
from unittest.mock import MagicMock

sys.modules.setdefault("customtkinter", MagicMock())
sys.path.append(str(Path(__file__).resolve().parents[1]))
import kartoteka.ui as ui  # noqa: E402
importlib.reload(ui)


def test_build_shoper_payload_forwards_optional_fields():
    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    card = {
        "nazwa": "Sample",
        "numer": "5",
        "product_code": "PKM-TEST",
        "cena": 12.5,
        "vat": "23%",
        "unit": "szt.",
        "category": "Karty",
        "producer": "Pokemon",
        "short_description": "short",
        "description": "desc",
        "availability": 3,
        "delivery": "24h",
        "ilość": 2,
        "stock_warnlevel": 1,
        "producer_id": 11,
        "group_id": 22,
        "tax_id": 33,
        "category_id": 44,
        "unit_id": 55,
        "type": "virtual",
        "code": "CODE-123",
        "ean": "1234567890123",
        "pkwiu": "58.11",
        "tags": ["tag1", "tag2"],
        "collections": ["coll"],
        "additional_codes": ["A1"],
        "dimensions": {"width": 1.1, "height": 2.2},
        "virtual": True,
        "image1": "img.jpg",
    }

    payload = app._build_shoper_payload(card)

    assert payload["stock"] == {"stock": 2, "warnlevel": 1}
    assert "ean" not in payload
    assert "type" not in payload
    assert payload["producer_id"] == 11
    assert payload["group_id"] == 22
    assert payload["tax_id"] == 33
    assert payload["category_id"] == 44
    assert payload["unit_id"] == 55
    assert "code" not in payload
    assert payload["pkwiu"] == "58.11"
    assert payload["dimensions"] == {"width": 1.1, "height": 2.2}
    assert payload["tags"] == ["tag1", "tag2"]
    assert payload["collections"] == ["coll"]
    assert payload["additional_codes"] == ["A1"]
    assert payload["virtual"] is True
    assert "images" not in payload

    minimal = {"nazwa": "Sample", "product_code": "PKM-EMPTY"}
    minimal_payload = app._build_shoper_payload(minimal)
    assert minimal_payload["stock"] == {"stock": 1}
    assert "ean" not in minimal_payload
    assert "dimensions" not in minimal_payload

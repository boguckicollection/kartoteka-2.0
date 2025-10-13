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
    app._shoper_taxonomy_cache = {
        "category": {"by_name": {"karty": 44}},
        "producer": {"by_name": {"pokemon": 11}},
        "tax": {"by_name": {"23%": 33}},
        "unit": {"by_name": {"szt.": 55}},
        "availability": {"by_name": {"3": 3, "dostepny": 3}},
    }
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
        "seo_title": "SEO Title",
        "seo_description": "SEO Desc",
        "seo_keywords": "key1, key2",
        "permalink": "sample-product",
        "availability": "Dostepny",
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

    assert payload["translations"] == {
        "pl_PL": {
            "name": "Sample 5",
            "short_description": "short",
            "description": "desc",
            "seo_title": "SEO Title",
            "seo_description": "SEO Desc",
            "seo_keywords": "key1, key2",
            "permalink": "sample-product",
        }
    }
    assert payload["stock"] == {"stock": 2, "warn_level": 1}
    assert "ean" not in payload
    assert "type" not in payload
    assert payload["producer_id"] == 11
    assert payload["group_id"] == 22
    assert payload["tax_id"] == 33
    assert payload["category_id"] == 44
    assert payload["unit_id"] == 55
    assert payload["availability_id"] == 3
    for field in ("name", "short_description", "description", "category", "producer", "delivery", "unit", "vat", "availability"):
        assert field not in payload
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
    assert minimal_payload["translations"] == {"pl_PL": {"name": "Sample"}}
    for field in ("name", "short_description", "description", "category", "producer", "unit", "vat", "availability"):
        assert field not in minimal_payload

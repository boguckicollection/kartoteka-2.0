import importlib
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.modules.setdefault("customtkinter", MagicMock())
sys.path.append(str(Path(__file__).resolve().parents[1]))
import kartoteka.ui as ui  # noqa: E402
importlib.reload(ui)


def test_build_shoper_payload_forwards_optional_fields():
    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    app.shoper_client = MagicMock()
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

    app.shoper_client.get.assert_not_called()

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


def test_build_shoper_payload_accepts_dict_taxonomy_values():
    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    app.shoper_client = MagicMock()
    app._shoper_taxonomy_cache = {
        "category": {"by_name": {"karty": 44}},
        "producer": {"by_name": {"pokemon": 11}},
        "tax": {"by_name": {"23%": 33}},
        "unit": {"by_name": {"szt.": 55}},
        "availability": {"by_name": {"dostępny": 3}},
    }

    card = {
        "nazwa": "Sample",
        "product_code": "PKM-DICT",
        "category": {"name": "Karty"},
        "producer": {"producer_id": 11, "name": "Pokemon"},
        "vat": {"value": "23%"},
        "unit": {"unit_id": 55},
        "availability": {"availability_id": 3, "name": "Dostępny"},
    }

    payload = app._build_shoper_payload(card)

    assert payload["category_id"] == 44
    assert payload["producer_id"] == 11
    assert payload["tax_id"] == 33
    assert payload["unit_id"] == 55
    assert payload["availability_id"] == 3


def test_build_shoper_payload_prefers_translation_locale_content():
    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    app.shoper_client = MagicMock()
    card = {
        "nazwa": "Sample",
        "product_code": "PKM-TRANS",
        "short_description": "legacy short",
        "description": "legacy desc",
        "seo_title": "legacy title",
        "seo_description": "legacy seo desc",
        "seo_keywords": "legacy keywords",
        "permalink": "legacy-link",
        "translations": [
            {
                "translation_id": 1,
                "language_code": "pl_PL",
                "short_description": "translated short",
                "description": "translated desc",
                "seo_title": "translated title",
                "seo_description": "translated seo desc",
                "seo_keywords": "translated keywords",
                "permalink": "translated-link",
            },
            {
                "translation_id": 2,
                "language_code": "en_US",
                "short_description": "english short",
            },
        ],
    }

    payload = app._build_shoper_payload(card)

    translation = payload["translations"]["pl_PL"]
    assert translation["name"] == "Sample"
    assert translation["short_description"] == "translated short"
    assert translation["description"] == "translated desc"
    assert translation["seo_title"] == "translated title"
    assert translation["seo_description"] == "translated seo desc"
    assert translation["seo_keywords"] == "translated keywords"
    assert translation["permalink"] == "translated-link"


def test_build_shoper_payload_fetches_taxonomy_when_missing():
    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    client = MagicMock()
    responses = {
        "categories": {"list": [{"category_id": 44, "name": "Karty"}]},
        "producers": {"list": [{"producer_id": 11, "name": "Pokemon"}]},
        "taxes": {"list": [{"tax_id": 33, "name": "23%"}]},
        "units": {"list": [{"unit_id": 55, "name": "szt."}]},
        "availabilities": {
            "list": [
                {"availability_id": 3, "name": "Dostępny"},
                {"availability_id": 7, "name": "Niedostępny", "default": True},
            ]
        },
    }

    def _fake_get(endpoint, **kwargs):
        return responses[endpoint]

    client.get.side_effect = _fake_get
    app.shoper_client = client
    app._shoper_taxonomy_cache = {}

    card = {
        "nazwa": "Sample",
        "product_code": "PKM-TEST",
        "category": "Karty",
        "producer": "Pokemon",
        "vat": "23%",
        "unit": "szt.",
        "availability": "Dostepny",
    }

    payload = app._build_shoper_payload(card)

    assert payload["category_id"] == 44
    assert payload["producer_id"] == 11
    assert payload["tax_id"] == 33
    assert payload["unit_id"] == 55
    assert payload["availability_id"] == 3
    assert client.get.call_count == 5
    for endpoint in ("categories", "producers", "taxes", "units", "availabilities"):
        assert any(call.args[0] == endpoint for call in client.get.call_args_list)

    cache = app._shoper_taxonomy_cache
    assert cache["category"]["by_name"]["Karty"] == 44
    assert cache["availability"]["aliases"]["3"] == 3


def test_build_shoper_payload_missing_required_taxonomy_raises():
    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    client = MagicMock()
    client.get.return_value = {"list": [{"category_id": 1, "name": "Inna"}]}
    app.shoper_client = client
    app._shoper_taxonomy_cache = {}

    card = {
        "nazwa": "Sample",
        "product_code": "PKM-TEST",
        "category": "Nieznana",
    }

    with pytest.raises(RuntimeError) as excinfo:
        app._build_shoper_payload(card)

    message = str(excinfo.value)
    assert "kategorii" in message
    assert "Nieznana" in message

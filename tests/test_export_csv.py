import csv
import importlib
from types import SimpleNamespace
from unittest.mock import MagicMock
from pathlib import Path
import sys

sys.modules.setdefault("customtkinter", MagicMock())
sys.path.append(str(Path(__file__).resolve().parents[1]))

import kartoteka.csv_utils as csv_utils


def _reload_csv_utils(monkeypatch, tmp_path):
    monkeypatch.setenv("STORE_CACHE_JSON", str(tmp_path / "cache.json"))
    globals()["csv_utils"] = importlib.reload(csv_utils)
    return csv_utils


def _make_app(rows):
    return SimpleNamespace(output_data=rows, session_entries=[])


def test_export_includes_new_fields(tmp_path, monkeypatch):
    module = _reload_csv_utils(monkeypatch, tmp_path)

    app = _make_app(
        [
            {
                "nazwa": "Pikachu",
                "numer": "1",
                "set": "Base",
                "era": "Era1",
                "product_code": 1,
                "cena": "10",
                "category": "Karty Pokémon > Era1 > Base",
                "producer": "Pokemon",
                "short_description": "s",
                "description": "d",
                "image1": "img.jpg",
            }
        ]
    )

    rows = module.export_csv(app)
    assert len(rows) == 1
    row = rows[0]
    assert row["name"] == "Pikachu"
    assert row["category"] == "Karty Pokémon > Era1 > Base"
    assert row["currency"] == "PLN"
    assert row["producer_code"] == "1"
    assert row["stock"] == "1"
    assert row["active"] == "1"
    assert row["vat"] == "23%"
    assert row["images 1"] == "img.jpg"
    assert row["price"] == "10"

    out_path = tmp_path / "out.csv"
    module.write_store_csv(rows, out_path)
    with open(out_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        saved = list(reader)
        assert reader.fieldnames == module.STORE_FIELDNAMES
        assert saved[0]["name"] == "Pikachu"


def test_merge_by_product_code(tmp_path, monkeypatch):
    module = _reload_csv_utils(monkeypatch, tmp_path)

    app = _make_app(
        [
            {
                "nazwa": "Pikachu",
                "numer": "1",
                "set": "Base",
                "era": "Era1",
                "product_code": "PC1",
                "cena": "10",
                "category": "Karty Pokémon > Era1 > Base",
                "producer": "Pokemon",
                "short_description": "s",
                "description": "d",
                "image1": "img.jpg",
            },
            {
                "nazwa": "Charmander",
                "numer": "2",
                "set": "Base",
                "era": "Era2",
                "product_code": "PC1",
                "cena": "5",
                "category": "Karty Pokémon > Era2 > Base",
                "producer": "Pokemon",
                "short_description": "s",
                "description": "d",
                "image1": "img.jpg",
            },
        ]
    )

    rows = module.export_csv(app)
    assert len(rows) == 1
    assert rows[0]["product_code"] == "PC1"
    assert rows[0]["stock"] == "2"


def test_export_appends_warehouse(tmp_path, monkeypatch):
    module = _reload_csv_utils(monkeypatch, tmp_path)

    inv_path = tmp_path / "inv.csv"
    row_data = {
        "nazwa": "Pikachu",
        "numer": "1",
        "set": "Base",
        "era": "Era1",
        "product_code": 1,
        "cena": "10",
        "category": "Karty Pokémon > Era1 > Base",
        "producer": "Pokemon",
        "short_description": "s",
        "description": "d",
        "image1": "img.jpg",
        "warehouse_code": "K1R1P1",
    }
    app = SimpleNamespace(
        output_data=[row_data],
        session_entries=[],
        update_inventory_stats=MagicMock(),
    )

    rows = module.export_csv(app)
    module.append_warehouse_csv(app, path=str(inv_path), exported_rows=rows)

    with open(inv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        saved = list(reader)
        assert reader.fieldnames == module.WAREHOUSE_FIELDNAMES
        row = saved[0]
        assert row["name"] == "Pikachu"
        assert row["number"] == "1"
        assert row["set"] == "Base"
        assert row["warehouse_code"] == "K1R1P1"
        assert row["price"] == "10"
        assert row["image"] == "img.jpg"
        assert row["variant"] == "common"
        assert row.get("sold", "") == ""

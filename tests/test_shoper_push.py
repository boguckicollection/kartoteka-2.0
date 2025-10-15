import importlib
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.modules.setdefault("customtkinter", MagicMock())
sys.path.append(str(Path(__file__).resolve().parents[1]))
import kartoteka.ui as ui
importlib.reload(ui)


def test_send_card_to_shoper_updates_existing_product():
    update_mock = MagicMock(return_value={"product_id": "789"})
    add_mock = MagicMock()

    client = SimpleNamespace(
        update_product=update_mock,
        add_product=add_mock,
        add_product_attribute=MagicMock(),
    )

    app = ui.CardEditorApp.__new__(ui.CardEditorApp)
    app.shoper_client = client
    app.store_data = {"ABC": {"product_code": "ABC", "product_id": "789"}}
    app.product_code_map = {}
    app._build_shoper_payload = lambda card: {"product_code": "ABC", "name": "Test"}
    app._refresh_attribute_cache = lambda *a, **k: {"attributes": {}, "by_name": {}}
    app._resolve_attribute_id = lambda *a, **k: None
    app._normalize_attribute_payload = lambda *a, **k: []
    app._update_local_product_caches = lambda *a, **k: None

    card = {"product_code": "ABC", "attributes": {}}

    result = ui.CardEditorApp._send_card_to_shoper(app, card)

    update_mock.assert_called_once_with(
        "789", {"product_code": "ABC", "name": "Test"}
    )
    add_mock.assert_not_called()
    assert result.get("product_id") == "789"

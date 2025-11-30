from __future__ import annotations
import json
from .shoper_client import ShoperClient
from .settings import settings

ROOT_CATEGORY_ID = 38  # ID dla "Karty Pokémon"

def sync_shoper_categories():
    """
    Synchronizuje kategorie z tcg_sets.json do Shopera.
    Tworzy strukturę: Karty Pokémon -> Era -> Set.
    """
    client = ShoperClient(settings.shoper_base_url, settings.shoper_access_token)

    # 1. Wczytaj tcg_sets.json
    try:
        with open("tcg_sets.json", "r", encoding="utf-8") as f:
            sets_data = json.load(f)
    except FileNotFoundError:
        print("ERROR: tcg_sets.json not found!")
        return {"error": "tcg_sets.json not found"}

    # 2. Pobierz istniejące kategorie
    print("Fetching existing categories from Shoper...")
    existing_categories = client.get_all_categories()
    existing_by_name = {cat['translations']['pl_PL']['name']: cat for cat in existing_categories}
    print(f"Found {len(existing_categories)} existing categories.")

    # 3. Iteruj przez Ery i Sety
    for era, sets in sets_data.items():
        print(f"\nProcessing Era: {era}")
        
        # Sprawdź, czy Era istnieje
        era_category = existing_by_name.get(era)
        if not era_category:
            print(f"Era '{era}' not found. Creating...")
            era_payload = {
                "parent_id": ROOT_CATEGORY_ID,
                "translations": {
                    "pl_PL": {
                        "name": era,
                        "active": True,
                    }
                }
            }
            created_era = client.create_category(era_payload)
            era_id = created_era.get("category_id")
            if not era_id:
                print(f"ERROR: Failed to create Era '{era}'. Response: {created_era}")
                continue
            print(f"Era '{era}' created with ID: {era_id}")
        else:
            era_id = era_category['category_id']
            print(f"Era '{era}' already exists with ID: {era_id}")

        # Iteruj przez Sety w Erze
        for set_info in sets:
            set_name = set_info.get("name")
            if not set_name:
                continue

            print(f"  - Processing Set: {set_name}")
            set_category = existing_by_name.get(set_name)
            if not set_category:
                print(f"    Set '{set_name}' not found. Creating under Era ID {era_id}...")
                set_payload = {
                    "parent_id": era_id,
                    "translations": {
                        "pl_PL": {
                            "name": set_name,
                            "active": True,
                        }
                    }
                }
                created_set = client.create_category(set_payload)
                set_id = created_set.get("category_id")
                if not set_id:
                    print(f"    ERROR: Failed to create Set '{set_name}'. Response: {created_set}")
                    continue
                print(f"    Set '{set_name}' created with ID: {set_id}")
            else:
                print(f"    Set '{set_name}' already exists.")

    print("\nCategory synchronization complete.")
    return {"status": "completed"}

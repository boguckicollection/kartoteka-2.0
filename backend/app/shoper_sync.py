import json
import os
import traceback
import asyncio
from .shoper import ShoperClient
from .settings import settings

ROOT_CATEGORY_ID = 38  # ID dla "Karty Pokémon"

async def sync_shoper_categories_async():
    """
    Synchronizuje kategorie z tcg_sets.json do Shopera (Async).
    Tworzy strukturę: Karty Pokémon -> Era -> Set.
    """
    client = ShoperClient(settings.shoper_base_url, settings.shoper_access_token)

    # 1. Wczytaj tcg_sets.json
    sets_data = None
    possible_paths = ["/app/tcg_sets.json", "tcg_sets.json"]
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    sets_data = json.load(f)
                print(f"Loaded tcg_sets.json from {path}")
                break
            except Exception as e:
                print(f"ERROR: Failed to read or parse {path}: {e}")
    
    if not sets_data:
        msg = "ERROR: tcg_sets.json not found in any checked locations!"
        print(msg)
        return {"error": msg}

    # 2. Pobierz istniejące kategorie
    print("Fetching existing categories from Shoper...")
    # Use the new async method
    existing_categories = await client.fetch_all_categories()
    
    existing_by_name = {}
    for cat in existing_categories:
        try:
            name = cat.get('translations', {}).get('pl_PL', {}).get('name')
            if name:
                existing_by_name[name] = cat
        except Exception:
            continue # Skip malformed category data
            
    print(f"Found {len(existing_categories)} existing categories, indexed {len(existing_by_name)} by name.")

    # 3. Iteruj przez Ery i Sety
    for era, sets in sets_data.items():
        print(f"\nProcessing Era: {era}")
        
        # Sprawdź, czy Era istnieje
        era_category = existing_by_name.get(era)
        era_id = None
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
            # Use async create
            try:
                created_era = await client.create_category_async(era_payload)
                if isinstance(created_era, int):
                    era_id = created_era
                else:
                    era_id = created_era.get("category_id") or created_era.get("id")
                if not era_id:
                    print(f"ERROR: Failed to create Era '{era}'. Response: {created_era}")
                    continue
                print(f"Era '{era}' created with ID: {era_id}")
                existing_by_name[era] = {"category_id": era_id}
            except Exception as e:
                print(f"ERROR: Exception creating Era '{era}': {e}")
                continue
        else:
            era_id = era_category.get('category_id') or era_category.get("id")
            print(f"Era '{era}' already exists with ID: {era_id}")

        if not era_id:
            print(f"FATAL: Could not determine ID for Era '{era}'. Skipping its sets.")
            continue

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
                    "parent_id": int(era_id),
                    "translations": {
                        "pl_PL": {
                            "name": set_name,
                            "active": True,
                        }
                    }
                }
                try:
                    created_set = await client.create_category_async(set_payload)
                    if isinstance(created_set, int):
                        set_id = created_set
                    else:
                        set_id = created_set.get("category_id") or created_set.get("id")
                    
                    if not set_id:
                        print(f"    ERROR: Failed to create Set '{set_name}'. Response: {created_set}")
                        continue
                    print(f"    Set '{set_name}' created with ID: {set_id}")
                    existing_by_name[set_name] = {"category_id": set_id}
                except Exception as e:
                    print(f"    ERROR: Exception creating Set '{set_name}': {e}")
            else:
                print(f"    Set '{set_name}' already exists.")

    print("\nCategory synchronization complete.")
    return {"status": "completed"}

def sync_shoper_categories():
    """Wrapper for running async sync synchronously."""
    return asyncio.run(sync_shoper_categories_async())

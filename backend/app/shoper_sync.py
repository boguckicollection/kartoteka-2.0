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
    
    # Map name -> list of categories (to handle duplicates like Era name == Set name)
    existing_by_name = {}
    for cat in existing_categories:
        try:
            name = cat.get('translations', {}).get('pl_PL', {}).get('name')
            if name:
                # Normalize name: strip whitespace
                norm_name = name.strip()
                if norm_name not in existing_by_name:
                    existing_by_name[norm_name] = []
                existing_by_name[norm_name].append(cat)
        except Exception:
            continue # Skip malformed category data
            
    print(f"Found {len(existing_categories)} existing categories, indexed {len(existing_by_name)} unique names.")

    # Deduplication routine
    deleted_count = 0
    for name, cats in existing_by_name.items():
        if len(cats) > 1:
            # Group by parent_id
            by_parent = {}
            for cat in cats:
                pid = cat.get("parent_id")
                try:
                    pid = int(pid) if pid is not None else 0
                except (ValueError, TypeError):
                    pid = 0
                if pid not in by_parent:
                    by_parent[pid] = []
                by_parent[pid].append(cat)
            
            # Check for duplicates within same parent
            for pid, duplicate_cats in by_parent.items():
                if len(duplicate_cats) > 1:
                    print(f"WARNING: Found {len(duplicate_cats)} duplicate categories for '{name}' (Parent ID: {pid}). Keeping oldest...")
                    # Sort by ID (assuming lower ID is older)
                    duplicate_cats.sort(key=lambda x: int(x.get("category_id") or x.get("id") or 999999999))
                    # Keep first, delete others
                    to_delete = duplicate_cats[1:]
                    for del_cat in to_delete:
                        del_id = int(del_cat.get("category_id") or del_cat.get("id"))
                        print(f"  - Deleting duplicate category ID {del_id}...")
                        try:
                            success = await client.delete_category_async(del_id)
                            if success:
                                print(f"    SUCCESS: Deleted category {del_id}")
                                deleted_count += 1
                                # Remove from existing_by_name to avoid confusion later
                                existing_by_name[name].remove(del_cat)
                            else:
                                print(f"    ERROR: Failed to delete category {del_id}")
                        except Exception as e:
                            print(f"    ERROR: Exception deleting category {del_id}: {e}")

    if deleted_count > 0:
        print(f"Cleanup complete. Deleted {deleted_count} duplicate categories.")

    def find_category(name: str, parent_id: int) -> dict | None:
        """Find a category by name and parent_id."""
        candidates = existing_by_name.get(name.strip(), [])
        for cat in candidates:
            try:
                # Shoper sometimes returns parent_id as string or int
                pid = cat.get("parent_id")
                # Handle root category check (parent_id 0 or None)
                pid_int = int(pid) if pid is not None else 0
                
                # Special logic for ROOT_CATEGORY_ID which is a parent itself, but its parent is 0/None?
                # No, we are searching for children OF parent_id.
                # So we check if cat.parent_id == parent_id
                
                if pid_int == int(parent_id):
                    return cat
            except (ValueError, TypeError):
                continue
        return None

    # 3. Iteruj przez Ery i Sety
    for era, sets in sets_data.items():
        print(f"\nProcessing Era: {era}")
        
        # Sprawdź, czy Era istnieje (parent_id = ROOT_CATEGORY_ID)
        era_category = find_category(era, ROOT_CATEGORY_ID)
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
                
                # Add to local cache for subsequent lookups
                new_cat = {"category_id": era_id, "parent_id": ROOT_CATEGORY_ID, "translations": {"pl_PL": {"name": era}}}
                if era not in existing_by_name:
                    existing_by_name[era] = []
                existing_by_name[era].append(new_cat)
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
            # Check if Set exists (parent_id = era_id)
            set_category = find_category(set_name, era_id)
            
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
                    
                    # Add to local cache
                    new_set_cat = {"category_id": set_id, "parent_id": era_id, "translations": {"pl_PL": {"name": set_name}}}
                    if set_name not in existing_by_name:
                        existing_by_name[set_name] = []
                    existing_by_name[set_name].append(new_set_cat)
                    
                except Exception as e:
                    print(f"    ERROR: Exception creating Set '{set_name}': {e}")
            else:
                print(f"    Set '{set_name}' already exists.")

    print("\nCategory synchronization complete.")
    return {"status": "completed"}

def sync_shoper_categories():
    """Wrapper for running async sync synchronously."""
    return asyncio.run(sync_shoper_categories_async())

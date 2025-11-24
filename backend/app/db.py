from __future__ import annotations

from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, event
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.engine import Engine

from .settings import settings


connect_args = {}
if settings.database_url.startswith("sqlite"):
    # Allow usage across threads and increase lock wait timeout
    connect_args = {"check_same_thread": False, "timeout": 15}

engine: Engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    future=True,
    pool_pre_ping=True,
)

if settings.database_url.startswith("sqlite"):
    # Apply SQLite pragmas for better concurrency
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore
        try:
            cursor = dbapi_connection.cursor()
            # Use DELETE mode instead of WAL to avoid permission issues
            cursor.execute("PRAGMA journal_mode=DELETE")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.close()
        except Exception:
            pass
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()


class Scan(Base):
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    filename = Column(String(255), nullable=True)
    stored_path = Column(Text, nullable=True)
    stored_path_back = Column(Text, nullable=True)
    message = Column(Text, nullable=True)

    detected_name = Column(String(255), nullable=True)
    detected_set = Column(String(255), nullable=True)
    detected_set_code = Column(String(64), nullable=True)
    detected_number = Column(String(64), nullable=True)
    detected_language = Column(String(64), nullable=True)
    detected_variant = Column(String(64), nullable=True)
    detected_condition = Column(String(64), nullable=True)
    detected_rarity = Column(String(64), nullable=True)
    detected_energy = Column(String(64), nullable=True)
    detected_payload = Column(Text, nullable=True)

    # Product publishing preferences
    use_tcggo_image = Column(Boolean, default=True, nullable=True)  # True = TCGGO, False = local scan
    additional_images = Column(Text, nullable=True)  # JSON array of file paths
    warehouse_code = Column(String(64), nullable=True, index=True)  # K1K1P001 format

    selected_candidate_id = Column(Integer, ForeignKey("scan_candidates.id"), nullable=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True, index=True)
    publish_status = Column(String(32), nullable=True)  # pending, published, failed
    published_shoper_id = Column(Integer, nullable=True)
    published_at = Column(DateTime, nullable=True)

    # Pricing fields
    cardmarket_currency = Column(String(8), nullable=True)
    cardmarket_7d_average = Column(Float, nullable=True)
    price_pln = Column(Float, nullable=True)
    price_pln_final = Column(Float, nullable=True)
    graded_psa10 = Column(Float, nullable=True)
    graded_currency = Column(String(8), nullable=True)

    candidates = relationship(
        "ScanCandidate",
        back_populates="scan",
        foreign_keys=lambda: [ScanCandidate.scan_id],
        primaryjoin=lambda: Scan.id == ScanCandidate.scan_id,
        cascade="all, delete-orphan",
    )
    selected_candidate = relationship(
        "ScanCandidate",
        foreign_keys=[selected_candidate_id],
        post_update=True,
        uselist=False,
    )


class ScanCandidate(Base):
    __tablename__ = "scan_candidates"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(String(128), nullable=False)
    name = Column(String(255), nullable=False)
    set = Column(String(255), nullable=True)
    set_code = Column(String(64), nullable=True)
    number = Column(String(64), nullable=True)
    rarity = Column(String(128), nullable=True)
    image = Column(Text, nullable=True)
    score = Column(Float, nullable=False, default=0.0)
    chosen = Column(Boolean, default=False, nullable=False)

    scan = relationship(
        "Scan",
        back_populates="candidates",
        foreign_keys=[scan_id],
        primaryjoin=lambda: Scan.id == ScanCandidate.scan_id,
    )


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(32), default="open", nullable=False)
    starting_warehouse_code = Column(String(64), nullable=True)


class InventoryItem(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=True)
    number = Column(String(64), nullable=True)
    set = Column(String(255), nullable=True)
    warehouse_code = Column(String(64), nullable=True, index=True)
    price = Column(Float, nullable=True)
    image = Column(Text, nullable=True)
    variant = Column(String(64), nullable=True)
    sold = Column(Integer, nullable=True)
    added_at = Column(String(32), nullable=True)


class Fingerprint(Base):
    __tablename__ = "fingerprints"
    id = Column(Integer, primary_key=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False)
    phash = Column(Text, nullable=False)
    dhash = Column(Text, nullable=False)
    tile_phash = Column(Text, nullable=False)
    orb = Column(Text, nullable=True)
    meta = Column(Text, nullable=True)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    shoper_id = Column(Integer, unique=True, index=True, nullable=False)
    code = Column(String(128), nullable=True)
    name = Column(String(255), nullable=True)
    price = Column(Float, nullable=True)
    stock = Column(Integer, nullable=True)
    image = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    tcggo_id = Column(String(128), nullable=True) # New: Unique ID from TCGGO
    fingerprint_hash = Column(Text, nullable=True) # New: Hash for duplicate detection
    last_price_update = Column(DateTime, nullable=True) # New: Timestamp of last price update
    # Extra metadata from Shoper
    category_id = Column(Integer, nullable=True)
    categories = Column(Text, nullable=True)  # JSON or comma-separated
    producer_id = Column(Integer, nullable=True)
    tax_id = Column(Integer, nullable=True)
    permalink = Column(Text, nullable=True)
    main_image_gfx_id = Column(String(64), nullable=True)
    main_image_extension = Column(String(16), nullable=True)
    main_image_unic_name = Column(String(64), nullable=True)

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    subscription_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def init_db():
    Base.metadata.create_all(bind=engine)
    # Best-effort lightweight migration for SQLite
    if not settings.database_url.startswith("sqlite"):
        return

    # Define the full desired schema
    schema = {
        "scans": [
            ("cardmarket_currency", "VARCHAR(8)"),
            ("cardmarket_7d_average", "FLOAT"),
            ("price_pln", "FLOAT"),
            ("price_pln_final", "FLOAT"),
            ("graded_psa10", "FLOAT"),
            ("graded_currency", "VARCHAR(8)"),
            ("session_id", "INTEGER"),
            ("publish_status", "VARCHAR(32)"),
            ("published_shoper_id", "INTEGER"),
            ("published_at", "DATETIME"),
            ("detected_rarity", "VARCHAR(64)"),
            ("detected_energy", "VARCHAR(64)"),
            ("detected_payload", "TEXT"),
            ("stored_path_back", "TEXT"),
            ("use_tcggo_image", "INTEGER DEFAULT 1"),
            ("additional_images", "TEXT"),
            ("warehouse_code", "VARCHAR(64)"),
        ],
        "sessions": [
            ("starting_warehouse_code", "VARCHAR(64)"),
        ],
        "products": [
            ("category_id", "INTEGER"),
            ("categories", "TEXT"),
            ("producer_id", "INTEGER"),
            ("tax_id", "INTEGER"),
            ("permalink", "TEXT"),
            ("main_image_gfx_id", "VARCHAR(64)"),
            ("main_image_extension", "VARCHAR(16)"),
            ("main_image_unic_name", "VARCHAR(64)"),
            ("tcggo_id", "VARCHAR(128)"),
            ("fingerprint_hash", "TEXT"),
            ("last_price_update", "DATETIME"),
        ],
        "scan_candidates": [
            ("rarity", "VARCHAR(128)"),
        ]
    }

    with engine.begin() as conn:
        for table_name, columns in schema.items():
            try:
                # Check if table exists
                res = conn.exec_driver_sql(f"PRAGMA table_info('{table_name}')").fetchall()
                existing_columns = {row[1] for row in res}
                
                for col_name, col_type in columns:
                    if col_name not in existing_columns:
                        print(f"Adding column '{col_name}' to table '{table_name}'...")
                        conn.exec_driver_sql(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}')
            except Exception as e:
                print(f"Could not migrate table {table_name}: {e}")

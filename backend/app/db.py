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
    # Best-effort lightweight migration for SQLite: add new columns if missing
    if settings.database_url.startswith("sqlite"):
        with engine.begin() as conn:
            try:
                cols = conn.exec_driver_sql("PRAGMA table_info('scans')").fetchall()
                have = {c[1] for c in cols}
                alters = []
                if "cardmarket_currency" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN cardmarket_currency VARCHAR(8)")
                if "cardmarket_7d_average" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN cardmarket_7d_average FLOAT")
                if "price_pln" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN price_pln FLOAT")
                if "price_pln_final" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN price_pln_final FLOAT")
                if "graded_psa10" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN graded_psa10 FLOAT")
                if "graded_currency" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN graded_currency VARCHAR(8)")
                if "session_id" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN session_id INTEGER")
                if "publish_status" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN publish_status VARCHAR(32)")
                if "published_shoper_id" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN published_shoper_id INTEGER")
                if "published_at" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN published_at DATETIME")
                if "detected_rarity" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN detected_rarity VARCHAR(64)")
                if "detected_energy" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN detected_energy VARCHAR(64)")
                if "stored_path_back" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN stored_path_back TEXT")
                if "use_tcggo_image" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN use_tcggo_image INTEGER DEFAULT 1")
                if "additional_images" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN additional_images TEXT")
                if "warehouse_code" not in have:
                    alters.append("ALTER TABLE scans ADD COLUMN warehouse_code VARCHAR(64)")
                for stmt in alters:
                    conn.exec_driver_sql(stmt)
                # Ensure inventory table exists
                conn.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS inventory (\n"
                    " id INTEGER PRIMARY KEY,\n"
                    " name VARCHAR(255),\n"
                    " number VARCHAR(64),\n"
                    " set VARCHAR(255),\n"
                    " warehouse_code VARCHAR(64),\n"
                    " price FLOAT,\n"
                    " image TEXT,\n"
                    " variant VARCHAR(64),\n"
                    " sold INTEGER,\n"
                    " added_at VARCHAR(32)\n"
                    ")"
                )
                # Ensure sessions table exists
                conn.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS sessions (\n"
                    " id INTEGER PRIMARY KEY,\n"
                    " created_at DATETIME,\n"
                    " status VARCHAR(32)\n"
                    ")"
                )
                # Ensure fingerprints table exists
                conn.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS fingerprints (\n"
                    " id INTEGER PRIMARY KEY,\n"
                    " scan_id INTEGER,\n"
                    " phash TEXT NOT NULL,\n"
                    " dhash TEXT NOT NULL,\n"
                    " tile_phash TEXT NOT NULL,\n"
                    " orb TEXT,\n"
                    " meta TEXT\n"
                    ")"
                )
                # Ensure products table exists
                conn.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS products (\n"
                    " id INTEGER PRIMARY KEY,\n"
                    " shoper_id INTEGER UNIQUE,\n"
                    " code VARCHAR(128),\n"
                    " name VARCHAR(255),\n"
                    " price FLOAT,\n"
                    " stock INTEGER,\n"
                    " image TEXT,\n"
                    " updated_at DATETIME,\n"
                    " category_id INTEGER,\n"
                    " categories TEXT,\n"
                    " producer_id INTEGER,\n"
                    " tax_id INTEGER,\n"
                    " permalink TEXT,\n"
                    " main_image_gfx_id VARCHAR(64),\n"
                    " main_image_extension VARCHAR(16),\n"
                    " main_image_unic_name VARCHAR(64)\n"
                    ")"
                )
                # Ensure price_history table exists
                conn.exec_driver_sql(
                    "CREATE TABLE IF NOT EXISTS price_history (\n"
                    " id INTEGER PRIMARY KEY,\n"
                    " product_id INTEGER NOT NULL,\n"
                    " price FLOAT NOT NULL,\n"
                    " timestamp DATETIME NOT NULL,\n"
                    " FOREIGN KEY(product_id) REFERENCES products(id)\n"
                    ")"
                )
                # Add columns if table exists from earlier
                cols_p = conn.exec_driver_sql("PRAGMA table_info('products')").fetchall()
                have_p = {c[1] for c in cols_p}
                add_cols = []
                if "category_id" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN category_id INTEGER")
                if "categories" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN categories TEXT")
                if "producer_id" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN producer_id INTEGER")
                if "tax_id" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN tax_id INTEGER")
                if "permalink" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN permalink TEXT")
                if "main_image_gfx_id" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN main_image_gfx_id VARCHAR(64)")
                if "main_image_extension" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN main_image_extension VARCHAR(16)")
                if "main_image_unic_name" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN main_image_unic_name VARCHAR(64)")
                if "tcggo_id" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN tcggo_id VARCHAR(128)")
                if "fingerprint_hash" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN fingerprint_hash TEXT")
                if "last_price_update" not in have_p:
                    add_cols.append("ALTER TABLE products ADD COLUMN last_price_update DATETIME")
                for stmt in add_cols:
                    conn.exec_driver_sql(stmt)
                # Migrate scan_candidates table
                cols_sc = conn.exec_driver_sql("PRAGMA table_info('scan_candidates')").fetchall()
                have_sc = {c[1] for c in cols_sc}
                add_cols_sc = []
                if "rarity" not in have_sc:
                    add_cols_sc.append("ALTER TABLE scan_candidates ADD COLUMN rarity VARCHAR(128)")
                for stmt in add_cols_sc:
                    conn.exec_driver_sql(stmt)
            except Exception:
                pass

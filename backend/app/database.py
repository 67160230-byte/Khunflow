import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlalchemy import text
from app.config import settings

def get_async_database_url() -> str:
    url = str(settings.DATABASE_URL or os.getenv("DATABASE_URL", "")).strip().strip("'\"")
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    
    # asyncpg requires stripping sslmode from query string if present
    if "sslmode=" in url:
        url = url.replace("sslmode=require", "").replace("sslmode=prefer", "").replace("sslmode=disable", "").rstrip("?&")
    
    return url

# Async Engine with statement_cache_size=0 for Supabase connection pooler compatibility
engine = create_async_engine(
    get_async_database_url(),
    echo=(settings.ENVIRONMENT == "development"),
    future=True,
    connect_args={"statement_cache_size": 0}
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Add tenant ownership to existing single-store installations without
        # requiring a destructive reset or a separate migration command.
        for table in ("suppliers", "ingredients", "products", "recipes", "orders", "waste_records", "stock_counts", "purchase_orders", "goods_receivings", "audit_logs"):
            await conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id)'))
            await conn.execute(text(f'CREATE INDEX IF NOT EXISTS "ix_{table}_business_id" ON "{table}" (business_id)'))
            await conn.execute(text(f'UPDATE "{table}" SET business_id = (SELECT id FROM businesses ORDER BY id LIMIT 1) WHERE business_id IS NULL'))
        await conn.execute(text("""
            INSERT INTO business_memberships (user_id, business_id, role, created_at)
            SELECT id, business_id, role, CURRENT_TIMESTAMP FROM users WHERE business_id IS NOT NULL
            ON CONFLICT (user_id, business_id) DO NOTHING
        """))
        await conn.execute(text('ALTER TABLE goods_receivings ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id)'))
        await conn.execute(text("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone VARCHAR NOT NULL DEFAULT 'Asia/Bangkok'"))

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

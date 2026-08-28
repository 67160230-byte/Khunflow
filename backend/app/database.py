import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
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

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

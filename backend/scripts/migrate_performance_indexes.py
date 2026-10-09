"""Run with PYTHONPATH=backend python backend/scripts/migrate_performance_indexes.py."""
import asyncio
import logging
from app.services.performance_indexes import ensure_performance_indexes
from app.database import engine

async def main():
    try:
        await ensure_performance_indexes()
    finally:
        await engine.dispose()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())

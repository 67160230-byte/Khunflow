"""Idempotent PostgreSQL index migration, safe for existing installations."""
import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from app.database import engine, get_async_database_url
from app.config import settings

logger = logging.getLogger(__name__)
INDEXES = [
    (f'ix_{table}_business_history', table, ('business_id', 'created_at', 'id'), 'business_id, created_at DESC, id DESC')
    for table in ('orders', 'waste_records', 'stock_counts', 'purchase_orders', 'audit_logs')
] + [
    ('ix_goods_receivings_business_history', 'goods_receivings', ('business_id', 'received_at', 'id'), 'business_id, received_at DESC, id DESC'),
    ('ix_orders_business_status_date', 'orders', ('business_id', 'status', 'created_at'), 'business_id, status, created_at'),
    ('ix_order_items_order_id', 'order_items', ('order_id',), 'order_id'),
    ('ix_recipe_items_recipe_id', 'recipe_items', ('recipe_id',), 'recipe_id'),
    ('ix_stock_count_items_count_id', 'stock_count_items', ('stock_count_id',), 'stock_count_id'),
    ('ix_purchase_order_items_po_ingredient', 'purchase_order_items', ('po_id', 'ingredient_id'), 'po_id, ingredient_id'),
]


async def ensure_performance_indexes(strict=True):
    url = get_async_database_url(settings.MIGRATION_DATABASE_URL or None)
    if make_url(url).port == 6543:
        message = 'Concurrent indexes require a direct/session database connection. Set MIGRATION_DATABASE_URL; transaction pooler port 6543 is not supported.'
        if strict: raise RuntimeError(message)
        logger.warning(message)
        return False
    migration_engine = create_async_engine(url, connect_args={'statement_cache_size': 0}, pool_size=1, max_overflow=0) if settings.MIGRATION_DATABASE_URL else engine
    try:
        await _migrate(migration_engine)
        return True
    finally:
        if migration_engine is not engine: await migration_engine.dispose()


async def _migrate(migration_engine):
    # CONCURRENTLY cannot run inside a transaction block.
    async with migration_engine.connect() as raw:
        conn = await raw.execution_options(isolation_level='AUTOCOMMIT')
        await conn.execute(text('SET lock_timeout = \'5s\''))
        await conn.execute(text('SET statement_timeout = \'120s\''))
        await conn.execute(text('SELECT pg_advisory_lock(73498242)'))
        try:
            for name, table, columns, definition in INDEXES:
                invalid = (await conn.execute(text('SELECT NOT indisvalid FROM pg_index JOIN pg_class ON pg_class.oid = indexrelid WHERE pg_class.relname = :name AND pg_class.relnamespace = current_schema()::regnamespace'), {'name': name})).scalar_one_or_none()
                if invalid:
                    await conn.execute(text(f'DROP INDEX CONCURRENTLY "{name}"'))
                indexes = await conn.run_sync(lambda sync: inspect(sync).get_indexes(table))
                valid_names = set((await conn.execute(text('SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE i.indisvalid AND c.relnamespace = current_schema()::regnamespace'))).scalars())
                # A wider non-partial btree with the same leading columns also supports these reads.
                matching = next((i for i in indexes if i['name'] in valid_names and tuple((i.get('column_names') or [])[:len(columns)]) == columns and not i.get('dialect_options', {}).get('postgresql_where') and i.get('dialect_options', {}).get('postgresql_using', 'btree') == 'btree' and not i.get('column_sorting')), None)
                exact = next((i for i in indexes if i['name'] == name), None)
                if exact:
                    if (tuple(exact.get('column_names') or []) != columns or name not in valid_names
                            or exact.get('dialect_options', {}).get('postgresql_where')
                            or exact.get('dialect_options', {}).get('postgresql_using', 'btree') != 'btree'):
                        raise RuntimeError(f'Unexpected definition for index {name}; inspect before migration')
                    continue
                if matching:
                    logger.info('Index %s covered by %s', name, matching['name'])
                    continue
                await conn.execute(text(f'CREATE INDEX CONCURRENTLY "{name}" ON "{table}" ({definition})'))
                logger.info('Created performance index %s', name)
            logger.info('Performance indexes ready')
        finally:
            await conn.execute(text('SELECT pg_advisory_unlock(73498242)'))
            await conn.execute(text('RESET lock_timeout'))
            await conn.execute(text('RESET statement_timeout'))


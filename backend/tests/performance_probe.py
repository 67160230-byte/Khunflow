"""Reproducible read-only endpoint timing after seeding an isolated database.

Run only against the disposable database named khunflow_perf_test.
"""
import asyncio
import argparse
from pathlib import Path
import json
import statistics
import time
from datetime import datetime, timedelta, timezone
from fastapi.encoders import jsonable_encoder
from sqlalchemy import event
from sqlmodel import SQLModel
from app.database import engine, async_session_maker
from app.models import (Business, User, UserRole, Product, ProductCategory,
                        Order, OrderStatus, OrderItem, Ingredient, IngredientUnit,
                        Supplier, Recipe, RecipeItem, WasteRecord, GoodsReceiving,
                        PurchaseOrder, PurchaseOrderItem, AuditLog, StockCount, StockCountItem)
from app.routers import inventory, operations, auth, platform_admin
from app.services.auth_service import get_password_hash


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output')
    options = parser.parse_args()
    if engine.url.database != 'khunflow_perf_test':
        raise RuntimeError('This probe requires the isolated khunflow_perf_test database')
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with async_session_maker() as session:
        if await session.get(Business, 9001) is None:
            now = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
            session.add(Business(id=9001, name='Performance fixture'))
            session.add(Business(id=9002, name='Other tenant'))
            await session.flush()
            session.add(User(id=9001, email='perf@example.com', hashed_password='unused', full_name='Perf', role=UserRole.OWNER, business_id=9001))
            session.add(Supplier(id=9001, name='Fixture supplier', business_id=9001))
            await session.flush()
            for i in range(1, 21):
                session.add(Product(id=i, name=f'Product {i}', category=ProductCategory.FOOD, selling_price=100, food_cost=30, business_id=9001))
                session.add(Ingredient(id=i, name=f'Ingredient {i}', unit=IngredientUnit.KG, current_stock=10, minimum_stock=2, average_cost=20, supplier_id=9001, business_id=9001))
            session.add(Product(id=9002, name='Other product', category=ProductCategory.FOOD, selling_price=999, business_id=9002))
            await session.flush()
            for i in range(1, 21):
                session.add(Recipe(id=i, product_id=i, total_cost=30, business_id=9001))
            await session.flush()
            for i in range(1, 21):
                session.add(RecipeItem(recipe_id=i, ingredient_id=i, quantity=1, unit=IngredientUnit.KG, unit_cost=20, total_cost=20))
            for i in range(1, 1001):
                stamp = now - timedelta(days=i % 30)
                session.add(Order(id=i, total_amount=200, status=OrderStatus.CANCELLED if i % 10 == 0 else OrderStatus.COMPLETED, created_at=stamp, business_id=9001))
                session.add(WasteRecord(id=i, ingredient_id=i % 20 + 1, quantity=1, unit=IngredientUnit.KG, cost=20, created_at=stamp, business_id=9001))
                session.add(GoodsReceiving(id=i, supplier_id=9001, ingredient_id=i % 20 + 1, quantity=2, unit_cost=20, total_cost=40, lot_number=f'LOT-{i}', received_at=stamp, business_id=9001))
                session.add(PurchaseOrder(id=i, supplier_id=9001, total_cost=40, created_at=stamp, business_id=9001))
                session.add(AuditLog(actor_id=9001, action='create', entity_type='order', entity_id=str(i), created_at=stamp, business_id=9001))
            session.add(Order(id=9002, total_amount=999, created_at=now, business_id=9002))
            await session.flush()
            for i in range(1, 1001):
                session.add(OrderItem(order_id=i, product_id=i % 20 + 1, quantity=2, unit_price=100, subtotal=200))
                session.add(PurchaseOrderItem(po_id=i, ingredient_id=i % 20 + 1, quantity=2, unit_cost=20, total_cost=40))
            await session.commit()
        fixture_user = await session.get(User, 9001)
        if fixture_user.hashed_password == 'unused':
            fixture_user.hashed_password = get_password_hash('perf_example12')
            session.add(fixture_user); await session.commit()
    count = [0]
    def query_counter(*args): count[0] += 1
    event.listen(engine.sync_engine, 'before_cursor_execute', query_counter)
    results = {}
    async with async_session_maker() as session:
        user = await session.get(User, 9001)
        cases = {'orders': operations.list_orders, 'receiving': inventory.list_receiving,
                 'waste': operations.list_waste, 'purchase_orders': inventory.list_purchase_orders,
                 'recipes': inventory.list_recipes, 'suppliers': inventory.list_suppliers,
                 'audit': auth.list_audit_logs, 'dashboard': operations.dashboard,
                 'forecast': operations.forecast, 'recommendations': operations.purchase_recommendations}
        from app.routers.history import router, PageParams
        paged = {route.endpoint.__name__: route.endpoint for route in router.routes}
        for name in ('orders', 'waste_records', 'goods_receivings', 'purchase_orders', 'audit_logs'):
            cases[name + '_paged'] = paged['paged_' + name]
        for name, handler in cases.items():
            elapsed = []
            for _ in range(3):
                count[0] = 0
                start = time.perf_counter()
                args = {'current_user': user, 'session': session}
                if name == 'dashboard': args.update(days=7, offset_days=0)
                if name == 'forecast': args.update(days=7)
                if name.endswith('_paged'): args['params'] = PageParams(page=1, limit=25, from_date=None, to_date=None)
                try:
                    value = await handler(**args)
                except Exception as exc:
                    value = {'error': type(exc).__name__ + ': ' + str(exc)}
                payload = json.dumps(jsonable_encoder(value), ensure_ascii=False).encode()
                elapsed.append((time.perf_counter() - start) * 1000)
            results[name] = {'median_ms': round(statistics.median(elapsed), 2), 'queries': count[0], 'bytes': len(payload)}
            if isinstance(value, dict) and 'error' in value: results[name]['error'] = value['error']
    rendered = json.dumps(results, ensure_ascii=False, indent=2)
    if options.output: Path(options.output).write_text(rendered + '\n', encoding='utf-8')
    print(rendered)
    await engine.dispose()
    if any(result.get('error') for result in results.values()): raise RuntimeError('One or more benchmark handlers failed; inspect the output')


if __name__ == '__main__':
    asyncio.run(main())

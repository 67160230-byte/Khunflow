"""HTTP and business-rule regression checks on the isolated performance fixture."""
import asyncio
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import httpx
from fastapi import Request
from sqlalchemy import event, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.main import app
from app.database import engine, get_session
from app.services.auth_service import get_current_user
from app.services.auth_service import business_subscription_block_reason
from app.services.history import date_bounds
from app.config import settings
from app.services.performance_indexes import ensure_performance_indexes
from app.models import (User, UserRole, Order, OrderStatus, OrderItem, Product, Ingredient,
    WasteRecord, BusinessMembership, PlatformSubscription)


async def main():
    assert engine.url.database == 'khunflow_perf_test', 'Requires isolated fixture database'
    await ensure_performance_indexes()
    await ensure_performance_indexes()  # Must be idempotent.
    count = [0]
    event.listen(engine.sync_engine, 'before_cursor_execute', lambda *args: count.__setitem__(0, count[0] + 1))
    async with engine.connect() as connection:
        transaction = await connection.begin()
        await connection.execute(text("SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT max(id) FROM orders))"))
        async def session_override():
            async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                yield session
        async def user_override(request: Request):
            return User(id=9001, email='perf@example.test', hashed_password='unused', full_name='Perf',
                        role=UserRole(request.headers.get('X-Test-Role', 'owner')),
                        business_id=int(request.headers.get('X-Test-Business', '9001')))
        app.dependency_overrides[get_session] = session_override
        app.dependency_overrides[get_current_user] = user_override
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
                for path in ('orders', 'waste', 'receiving', 'purchase-orders', 'auth/audit-logs'):
                    count[0] = 0
                    first = await client.get(f'/api/{path}/paged')
                    assert first.status_code == 200, (path, first.text)
                    value = first.json()
                    assert len(value['items']) == 25 and value['total'] == 1000, (path, value)
                    assert count[0] <= 7, (path, count[0])
                    second = (await client.get(f'/api/{path}/paged?page=2')).json()
                    assert not ({r['id'] for r in value['items']} & {r['id'] for r in second['items']}), path
                    assert (await client.get(f'/api/{path}/paged?limit=101')).status_code == 422
                    assert (await client.get(f'/api/{path}/paged?page=0')).status_code == 422
                    assert (await client.get(f'/api/{path}/paged?from=2026-10-10&to=2026-10-01')).status_code == 422
                    empty = (await client.get(f'/api/{path}/paged?from=2099-01-01')).json()
                    assert empty['items'] == [] and empty['total'] == 0
                    assert (await client.get(f'/api/{path}/paged?page=9999')).json()['items'] == []
                    legacy = await client.get(f'/api/{path}')
                    assert legacy.status_code == 200 and isinstance(legacy.json(), list)
                orders = (await client.get('/api/orders/paged')).json()
                assert orders['summary'] == {'amount': 180000, 'active_count': 900}
                other = (await client.get('/api/orders/paged', headers={'X-Test-Business': '9002'})).json()
                assert other['total'] == 1 and other['items'][0]['id'] == 9002
                assert (await client.get('/api/receiving/paged', headers={'X-Test-Role': 'cashier'})).status_code == 403
                assert (await client.get('/api/setup-status', headers={'X-Test-Role': 'cashier'})).status_code == 403
                count[0] = 0
                setup = (await client.get('/api/setup-status')).json()
                assert count[0] == 3 and setup == {'steps': [True] * 5, 'costWarning': False}
                assert (await client.get('/api/setup-status', headers={'X-Test-Business': '9002'})).json()['steps'] == [False, False, True, False, True]

                # Match daily aggregation against the reference business formula.
                async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                    rows = (await session.execute(select(Order).where(Order.business_id == 9001))).scalars().all()
                    today = datetime.now(ZoneInfo('Asia/Bangkok')).date()
                    expected = {}
                    for order in rows:
                        day = order.created_at.astimezone(ZoneInfo('Asia/Bangkok')).date()
                        if order.status == OrderStatus.COMPLETED:
                            expected.setdefault(str(day), [0, 0])
                            expected[str(day)][0] += order.total_amount
                            expected[str(day)][1] += 1
                    dashboard = (await client.get('/api/dashboard?days=7')).json()
                    for row in dashboard['dailySales']:
                        amount, n = expected.get(row['date'], [0, 0])
                        assert row['revenue'] == amount and row['orders'] == n
                        assert row['foodCost'] == n * 60
                        assert row['grossProfit'] == amount - n * 60
                    assert dashboard['today'] == str(today)
                    assert len(dashboard['topSellers']) <= 3
                    # Offsets must not include newer orders.
                    older = (await client.get('/api/dashboard?days=2&offset_days=10')).json()
                    for row in older['dailySales']: assert row['revenue'] == expected.get(row['date'], [0, 0])[0]
                    forecast = (await client.get('/api/forecast')).json()
                    sold = dict((await session.execute(select(OrderItem.product_id, func.sum(OrderItem.quantity)).join(Order).where(Order.business_id == 9001, Order.status == OrderStatus.COMPLETED, Order.created_at >= datetime.now(timezone.utc) - timedelta(days=30)).group_by(OrderItem.product_id))).all())
                    for product in forecast: assert product['forecasts'][0]['predicted_qty'] == round(sold.get(int(product['product_id']), 0) / 30, 1)
                    recommendation = (await client.get('/api/purchase-recommendations')).json()
                    for rec in recommendation:
                        usage = sold.get(int(rec['ingredient_id']), 0) / 30 * 7
                        assert rec['forecast_usage'] == round(usage, 2)
                        assert rec['recommended_order'] == round(max(0, usage + 2 - 10), 2)

                    # A local day's lower bound is inclusive, the following midnight exclusive.
                    boundary = datetime(2030, 1, 1, 17, tzinfo=timezone.utc)  # Jan 2 Bangkok midnight
                    before = Order(business_id=9001, created_at=boundary - timedelta(microseconds=1), total_amount=1)
                    at_start = Order(business_id=9001, created_at=boundary, total_amount=2)
                    at_end = Order(business_id=9001, created_at=boundary + timedelta(days=1), total_amount=3)
                    session.add_all([before, at_start, at_end]); await session.commit()
                    filtered = (await client.get('/api/orders/paged?from=2030-01-02&to=2030-01-02')).json()
                    assert filtered['total'] == 1 and filtered['items'][0]['id'] == at_start.id
                    assert filtered['summary']['amount'] == 2

                # Existing stock transaction rules, including double cancel and insufficient stock.
                created = await client.post('/api/orders', json={'items': [{'product_id': 1, 'quantity': 2}]})
                assert created.status_code == 200, created.text
                order_id = created.json()['order_id']
                async def stock():
                    async with AsyncSession(bind=connection, join_transaction_mode='create_savepoint') as session:
                        return (await session.get(Ingredient, 1)).current_stock
                assert await stock() == 8
                assert (await client.post(f'/api/orders/{order_id}/cancel', json={'reason': 'test cancel'})).status_code == 200
                assert await stock() == 10
                assert (await client.post(f'/api/orders/{order_id}/cancel', json={'reason': 'test cancel'})).status_code == 409
                assert await stock() == 10
                assert (await client.post(f'/api/orders/{order_id}/restore')).status_code == 200
                assert await stock() == 8
                assert (await client.post('/api/orders', json={'items': [{'product_id': 1, 'quantity': 99}]})).status_code == 409
                assert await stock() == 8
                assert (await client.post(f'/api/orders/{order_id}/cancel', json={'reason': 'test cancel'}, headers={'X-Test-Business': '9002'})).status_code == 404
                dst_start, dst_end = date_bounds(datetime(2030, 3, 10).date(), datetime(2030, 3, 10).date(), ZoneInfo('America/New_York'))
                assert dst_end - dst_start == timedelta(hours=23)

                previous_admins = settings.PLATFORM_ADMIN_EMAILS
                settings.PLATFORM_ADMIN_EMAILS = 'perf@example.test'
                try:
                    async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                        if await session.get(BusinessMembership, (9001, 9001)) is None:
                            session.add(BusinessMembership(user_id=9001, business_id=9001, role=UserRole.OWNER))
                        session.add(PlatformSubscription(user_id=9001, status='canceled'))
                        await session.commit()
                        accounts = (await client.get('/api/platform-admin/accounts')).json()
                        owner = next(a for a in accounts if a['id'] == 9001)
                        assert owner['can_access'] is False and owner['access_reason'] == 'แพ็กเกจยกเลิก'
                        assert await business_subscription_block_reason(session, 9001) == owner['access_reason']
                        session.add(User(id=9501, email='coowner@example.com', hashed_password='unused', full_name='Co owner', role=UserRole.OWNER, business_id=9001))
                        await session.flush()
                        session.add(BusinessMembership(user_id=9501, business_id=9001, role=UserRole.OWNER))
                        session.add(PlatformSubscription(user_id=9501, status='active'))
                        await session.commit()
                        count[0] = 0
                        accounts = (await client.get('/api/platform-admin/accounts')).json()
                        assert count[0] == 5  # Three business queries plus test savepoint/release.
                        assert all(a['can_access'] for a in accounts)
                        assert await business_subscription_block_reason(session, 9001) is None
                finally:
                    settings.PLATFORM_ADMIN_EMAILS = previous_admins
            print('PASS: pagination, validation, summaries, tenant isolation, roles, setup, timezone boundaries, dashboard, forecast, recommendations, stock transactions, index idempotence')
        finally:
            app.dependency_overrides.clear()
            await transaction.rollback()
    await engine.dispose()


if __name__ == '__main__': asyncio.run(main())

"""Functional audit, isolated PostgreSQL fixture only; all data changes roll back."""
import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from fastapi import Request
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.database import engine, get_session
from app.models import User, UserRole, Order
from app.services.auth_service import get_current_user
from app.config import settings

async def main():
    assert engine.url.database == 'khunflow_perf_test'
    previous_admins, previous_demo = settings.PLATFORM_ADMIN_EMAILS, settings.DEMO_MODE
    results = []
    def record(name, passed, details=None):
        results.append({'check': name, 'passed': bool(passed), 'details': details})
        if not passed: print(json.dumps(results[-1], ensure_ascii=False), flush=True)
    async with engine.connect() as conn:
        transaction = await conn.begin()
        for table in ['products', 'ingredients', 'suppliers', 'recipes', 'orders', 'waste_records', 'purchase_orders', 'goods_receivings', 'users', 'audit_logs']:
            await conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT max(id) FROM {table}), 1))"))
        async def sessions():
            async with AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                yield session
        async def identity(request: Request):
            return User(id=9001, email='audit@example.com', hashed_password='unused', full_name='Audit', role=UserRole(request.headers.get('X-Test-Role', 'owner')), business_id=int(request.headers.get('X-Test-Business', '9001')))
        app.dependency_overrides[get_session] = sessions
        app.dependency_overrides[get_current_user] = identity
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url='http://test') as client:
                async def call(method, path, body=None, expected=200, headers=None):
                    response = await client.request(method, '/api' + path, json=body, headers=headers)
                    record(f'{method} {path}', response.status_code == expected, {'status': response.status_code, 'expected': expected, 'error': response.text[:300] if response.status_code >= 400 else None})
                    return response
                for path in ['/health', '/products', '/ingredients', '/recipes', '/suppliers', '/orders/paged', '/waste/paged', '/receiving/paged', '/purchase-orders/paged', '/stock-counts', '/analytics/variance', '/dashboard', '/forecast', '/purchase-recommendations', '/setup-status', '/business', '/businesses', '/auth/users', '/auth/audit-logs/paged']:
                    await call('GET', path)
                async with AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                    now = datetime.now(timezone.utc)
                    session.add_all([Order(business_id=9001, total_amount=500, created_at=now), Order(business_id=9001, total_amount=100, created_at=now-timedelta(days=1))])
                    await session.commit()
                overview = (await client.get('/api/dashboard')).json()
                today, yesterday = overview['dailySales'][-1], overview['dailySales'][-2]
                expected_change = (today['revenue'] - yesterday['revenue']) / yesterday['revenue'] * 100 if yesterday['revenue'] else 0
                record('Dashboard change matches daily sales', abs(overview['kpi']['salesChangePercent'] - expected_change) < 1e-6, {'actual': overview['kpi']['salesChangePercent'], 'expected': expected_change})
                for role, paths in {'cashier': ['/ingredients', '/suppliers', '/recipes', '/analytics/variance', '/auth/users'], 'inventory_staff': ['/recipes', '/analytics/variance', '/auth/users']}.items():
                    for path in paths:
                        # Legacy recipe reads have no role check, despite route restrictions.
                        await call('GET', path, expected=403, headers={'X-Test-Role': role})
                product = (await call('POST', '/products', {'name': 'Audit product', 'category': 'food', 'selling_price': 100, 'food_cost': 0})).json()
                ingredient = (await call('POST', '/ingredients', {'name': 'Audit flour', 'category': 'flour', 'unit': 'kg', 'current_stock': 10, 'average_cost': 20})).json()
                other = (await call('POST', '/ingredients', {'name': 'Audit milk', 'category': 'dairy', 'unit': 'l', 'current_stock': 10, 'average_cost': 10})).json()
                supplier = (await call('POST', '/suppliers', {'name': 'Audit supplier', 'contact_name': 'Audit', 'phone': '0000000000', 'email': 'supplier@example.com', 'payment_terms': 'Net 15'})).json()
                pid, iid, oid, sid = product['id'], ingredient['id'], other['id'], supplier['id']
                await call('POST', '/recipes', {'product_id': pid, 'items': [{'ingredient_id': iid, 'quantity': 100, 'unit': 'g'}]})
                cost = next(p['food_cost'] for p in (await client.get('/api/products')).json() if p['id'] == pid)
                record('Recipe grams to kg cost', cost == 2, {'actual': cost, 'expected': 2})
                await call('POST', '/recipes', {'product_id': pid, 'items': [{'ingredient_id': iid, 'quantity': 0.1, 'unit': 'kg'}]})
                order = (await call('POST', '/orders', {'items': [{'product_id': pid, 'quantity': 2}]})).json()
                stock = next(i['current_stock'] for i in (await client.get('/api/ingredients')).json() if i['id'] == iid)
                record('Order stock deduction', abs(stock - 9.8) < 1e-6)
                await call('POST', f"/orders/{order['order_id']}/cancel", {'reason': 'Audit cancellation'})
                await call('POST', f"/orders/{order['order_id']}/restore")
                await call('POST', '/waste', {'ingredient_id': iid, 'quantity': 100, 'unit': 'g', 'cost': 9999, 'reason': 'expired'})
                await call('POST', '/waste', {'ingredient_id': iid, 'quantity': 0.1, 'unit': 'kg', 'cost': 9999, 'reason': 'expired'})
                wastes = (await client.get('/api/waste')).json()
                newest = next(w for w in wastes if w['ingredient_id'] == iid)
                record('Waste cost computed server-side', abs(newest['cost'] - 2) < 1e-6)
                await call('POST', '/stock-counts', {'items': [{'ingredient_id': iid, 'counted_stock': 9, 'reason': 'counting_error'}]})
                await call('PUT', f'/ingredients/{iid}', {'expiration_date': '2030-01-01'})
                po = (await call('POST', '/purchase-orders', {'supplier_id': sid, 'items': [{'ingredient_id': iid, 'quantity': 10, 'unit_cost': 30}, {'ingredient_id': oid, 'quantity': 10, 'unit_cost': 15}]})).json()
                await call('POST', '/receiving', {'supplier_id': sid, 'purchase_order_id': po['id'], 'ingredient_id': iid, 'quantity': 1, 'unit_cost': 30, 'lot_number': 'AUDIT-PARTIAL'})
                observed = next(p for p in (await client.get('/api/purchase-orders')).json() if p['id'] == po['id'])
                await conn.execute(text("UPDATE purchase_orders SET status='RECEIVED' WHERE id=:id"), {'id': po['id']})
                await call('POST', f"/purchase-orders/{po['id']}/reopen")
                record('Partial receiving keeps PO open', observed['status'] == 'ordered', {'actual': observed['status'], 'expected': 'ordered; 1 of 10 on first of 2 lines received'})
                second = await client.post('/api/receiving', json={'supplier_id': sid, 'purchase_order_id': po['id'], 'ingredient_id': oid, 'quantity': 10, 'unit_cost': 15, 'lot_number': 'AUDIT-SECOND-LINE'})
                record('Can receive remaining PO line', second.status_code == 200, {'status': second.status_code})
                ingredients = (await client.get('/api/ingredients')).json()
                avg = next(i['average_cost'] for i in ingredients if i['id'] == iid)
                products = (await client.get('/api/products')).json()
                product_cost = next(p['food_cost'] for p in products if p['id'] == pid)
                record('Product recipe cost reflects new average cost', abs(product_cost - avg * 0.1) < 1e-6, {'product_cost': product_cost, 'expected': avg * 0.1})
                await call('POST', '/purchase-orders', {'supplier_id': sid, 'items': [{'ingredient_id': iid, 'quantity': 1, 'unit_cost': 10, 'unit': 'l'}]}, expected=422)
                record('PO payload exposes remaining quantity', observed['items'][0]['remaining_quantity'] == 9)
                await call('POST', '/receiving', {'supplier_id': sid, 'purchase_order_id': po['id'], 'ingredient_id': iid, 'quantity': 10, 'unit_cost': 30, 'lot_number': 'AUDIT-EXCESS'}, expected=422)
                await call('POST', '/receiving', {'supplier_id': sid, 'purchase_order_id': po['id'], 'ingredient_id': iid, 'quantity': 9, 'unit_cost': 30, 'lot_number': 'AUDIT-COMPLETE'})
                completed = next(p for p in (await client.get('/api/purchase-orders')).json() if p['id'] == po['id'])
                await call('POST', f"/purchase-orders/{po['id']}/reopen", expected=409)
                record('PO closes only after all quantities received', completed['status'] == 'received' and all(i['remaining_quantity'] == 0 for i in completed['items']))
                await call('POST', '/receiving', {'supplier_id': sid, 'purchase_order_id': po['id'], 'ingredient_id': iid, 'quantity': 1, 'unit_cost': 30, 'lot_number': 'AUDIT-REPEAT'}, expected=409)
                unit_po = (await call('POST', '/purchase-orders', {'supplier_id': sid, 'items': [{'ingredient_id': iid, 'quantity': 1000, 'unit_cost': 0.01, 'unit': 'g'}]})).json()
                unit_line = next(p for p in (await client.get('/api/purchase-orders')).json() if p['id'] == unit_po['id'])['items'][0]
                record('PO compatible units normalize quantity and cost', unit_line['unit'] == 'kg' and abs(unit_line['quantity'] - 1) < 1e-6 and abs(unit_line['unit_cost'] - 10) < 1e-6, unit_line)
                duplicate = (await call('POST', '/purchase-orders', {'supplier_id': sid, 'items': [{'ingredient_id': iid, 'quantity': 1, 'unit_cost': 10}, {'ingredient_id': iid, 'quantity': 1, 'unit_cost': 10}]})).json()
                received = await client.post('/api/receiving', json={'supplier_id': sid, 'purchase_order_id': duplicate['id'], 'ingredient_id': iid, 'quantity': 1, 'unit_cost': 10, 'lot_number': 'AUDIT-DUPLICATE'})
                record('Receiving PO with duplicate ingredient lines', received.status_code < 500, {'status': received.status_code})
                await call('POST', '/purchase-orders', {'supplier_id': sid, 'items': [{'ingredient_id': iid, 'quantity': 'abc', 'unit_cost': 10}]}, expected=422)
                await call('POST', '/ingredients', {'name': 'Invalid', 'category': 'flour', 'unit': 'kg', 'current_stock': -1}, expected=422)
                await call('POST', '/recipes', {'product_id': pid, 'items': []}, expected=422)
                await call('PATCH', f'/products/{pid}/status', {'is_active': False})
                await call('POST', '/orders', {'items': [{'product_id': pid, 'quantity': 1}]}, expected=404)
                await call('PATCH', f'/products/{pid}/status', {'is_active': True})
                recipe = next(r for r in (await client.get('/api/recipes')).json() if r['product_id'] == pid)
                await call('DELETE', f"/recipes/{recipe['id']}")
                record('Recipe deletion removes recipe', not any(r['product_id'] == pid for r in (await client.get('/api/recipes')).json()))
                employee = (await call('POST', '/auth/users', {'email': 'audit-employee@example.com', 'password': 'example_only123', 'full_name': 'Audit employee', 'role': 'cashier'})).json()
                settings.DEMO_MODE = True
                await call('POST', '/auth/forgot-password', {'email': 'audit-employee@example.com'})
                await call('POST', '/auth/demo-reset-password', {'email': 'audit-employee@example.com', 'new_password': 'example_changed123'})
                settings.DEMO_MODE = previous_demo
                settings.PLATFORM_ADMIN_EMAILS = 'audit@example.com'
                await call('GET', '/platform-admin/accounts')
                await call('PUT', f"/platform-admin/accounts/{employee['id']}/subscription", {'plan': 'lifetime', 'status': 'active'})
                await call('PATCH', f"/platform-admin/accounts/{employee['id']}/access", {'is_active': False})
                await call('PATCH', f"/platform-admin/accounts/{employee['id']}/access", {'is_active': True})
                settings.PLATFORM_ADMIN_EMAILS = previous_admins
                await call('DELETE', f"/auth/users/{employee['id']}")
                await call('POST', '/businesses', {'name': 'Audit shop'})
                await call('PUT', '/business', {'name': 'Audit updated shop', 'currency': 'USD', 'timezone': 'Asia/Tokyo'})
                await call('POST', '/products', {'name': 'Bad price', 'category': 'food', 'selling_price': -1}, expected=422)
                await call('PUT', '/business', {'timezone': 'not-a-real-timezone'}, expected=422)
                await call('GET', '/products', headers={'X-Test-Business': '9002'})
                await call('PUT', f'/ingredients/{iid}', {'expiration_date': '2030-01-01'}, headers={'X-Test-Business': '9002'}, expected=404)
                # Membership role must be returned instead of a user's default-shop role.
                await conn.execute(text("INSERT INTO business_memberships (user_id,business_id,role,created_at) VALUES (9001,9002,'CASHIER',CURRENT_TIMESTAMP) ON CONFLICT (user_id,business_id) DO UPDATE SET role='CASHIER'"))
                users = (await client.get('/api/auth/users', headers={'X-Test-Business': '9002'})).json()['data']
                reported = next(u['role'] for u in users if u['id'] == 9001)
                record('Users page returns current-shop membership role', reported == 'cashier', {'actual': reported, 'expected': 'cashier'})
                record('Dynamic role settings API exists', any('permission' in path for path in app.openapi()['paths']), {'note': 'Business-scoped permission API registered'})
        finally:
            settings.PLATFORM_ADMIN_EMAILS, settings.DEMO_MODE = previous_admins, previous_demo
            app.dependency_overrides.clear()
            await transaction.rollback()
    await engine.dispose()
    Path('/results/system-audit-fixed-tests.json').write_text(json.dumps(results, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'checks': len(results), 'passed': sum(r['passed'] for r in results), 'findings': [r for r in results if not r['passed']]}, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    asyncio.run(main())

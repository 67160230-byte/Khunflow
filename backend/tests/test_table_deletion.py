"""Recoverable table deletion through real API/auth and isolated transactions.

Run .venv/Scripts/python.exe backend/tests/test_table_deletion.py.
Uses a unique SQLite file, never production. Optional PostgreSQL target is
restricted to loopback:55442/khunflow_table_delete_test and must be empty.
"""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ['ENVIRONMENT'] = 'test'
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://unused:unused@127.0.0.1:1/unused_table_delete_test'
os.environ['MIGRATION_DATABASE_URL'] = os.environ['DATABASE_URL']
os.environ['JWT_SECRET'] = 'table-delete-test-only-secret-not-for-production-2026'
os.environ['PLATFORM_ADMIN_EMAILS'] = ''
os.environ['DEMO_MODE'] = 'false'

import httpx
from sqlalchemy import event, func
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel, select
from app.main import app
from app.database import get_session
from app.models import (Business, BusinessMembership, User, UserRole, Ingredient,
    IngredientUnit, Product, Recipe, RecipeItem, DiningTable, TableOrderRequest,
    Order, OrderItem, OrderStockUsage, AuditLog)
from app.services.auth_service import get_password_hash

DB = ROOT / '.venv' / f'table-delete-check-{uuid4().hex}.sqlite'
target_url = os.environ.get('TABLE_DELETE_TEST_DATABASE_URL')
if target_url:
    target = make_url(target_url)
    assert target.drivername == 'postgresql+asyncpg'
    assert target.host in ('127.0.0.1', 'localhost') and target.port == 55442
    assert target.database == 'khunflow_table_delete_test'
URL = target_url or 'sqlite+aiosqlite:///' + DB.as_posix()

def make_engine():
    value = create_async_engine(URL)
    if not target_url:
        @event.listens_for(value.sync_engine, 'connect')
        def foreign_keys(connection, _record):
            connection.execute('PRAGMA foreign_keys=ON')
    return value

engine = make_engine()
sessions = async_sessionmaker(engine, expire_on_commit=False)
PASSWORD = 'TableDeleteFixture123!'
EMAIL = 'delete-owner@example.com'

async def fixture_sessions():
    async with sessions() as session:
        yield session

async def initialize():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with sessions() as s:
        assert (await s.execute(select(func.count()).select_from(Business))).scalar_one() == 0
        s.add_all([Business(id=1001, name='Deletion test A'),
                   Business(id=1002, name='Deletion test B', currency='USD'),
                   Business(id=1003, name='Other owner test')])
        await s.flush()
        users = [(1001, EMAIL, UserRole.OWNER, 1001),
                 (1002, 'delete-cashier@example.com', UserRole.CASHIER, 1001),
                 (1003, 'delete-stock@example.com', UserRole.INVENTORY_STAFF, 1001),
                 (1004, 'delete-manager@example.com', UserRole.MANAGER, 1001),
                 (1005, 'delete-other@example.com', UserRole.OWNER, 1003)]
        for uid, email, role, bid in users:
            s.add(User(id=uid, email=email, full_name=email, role=role,
                       business_id=bid, hashed_password=get_password_hash(PASSWORD)))
        await s.flush()
        for uid, _, role, bid in users:
            s.add(BusinessMembership(user_id=uid, business_id=bid, role=role))
        s.add(BusinessMembership(user_id=1001, business_id=1002, role=UserRole.OWNER))
        for bid in (1001, 1002):
            s.add(Product(id=bid, business_id=bid, name=f'Test coffee {bid}', selling_price=60, food_cost=10))
            s.add(Ingredient(id=bid, business_id=bid, name=f'Test milk {bid}', unit=IngredientUnit.L,
                             current_stock=5, average_cost=100))
        await s.flush()
        for bid in (1001, 1002):
            s.add(Recipe(id=bid, business_id=bid, product_id=bid, total_cost=10))
        await s.flush()
        for bid in (1001, 1002):
            s.add(RecipeItem(recipe_id=bid, ingredient_id=bid, quantity=100,
                             unit=IngredientUnit.ML, unit_cost=.1, total_cost=10))
        await s.commit()

async def main():
    global engine, sessions
    checks = []
    def check(name, condition, **details):
        assert condition, (name, details)
        checks.append({'name': name, 'passed': True, **details})
        print(f'PASS {len(checks):02d}: {name}', flush=True)

    async def state():
        async with sessions() as s:
            stocks = {i.id: i.current_stock for i in (await s.execute(select(Ingredient))).scalars()}
            sales = [(o.id, o.business_id, o.total_amount, o.status.value)
                     for o in (await s.execute(select(Order).order_by(Order.id))).scalars()]
            counts = [(await s.execute(select(func.count()).select_from(model))).scalar_one()
                      for model in (OrderItem, OrderStockUsage, TableOrderRequest)]
            return stocks, sales, counts

    async def audit_count(action, tid):
        async with sessions() as s:
            return (await s.execute(select(func.count()).select_from(AuditLog).where(
                AuditLog.action == action, AuditLog.entity_type == 'table',
                AuditLog.entity_id == str(tid)))).scalar_one()

    async def reopen():
        global engine, sessions
        await engine.dispose()
        engine = make_engine()
        sessions = async_sessionmaker(engine, expire_on_commit=False)

    app.dependency_overrides[get_session] = fixture_sessions
    try:
        print('Preparing isolated database; production connections disabled', flush=True)
        await initialize()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://table-delete-fixture') as c:
            async def call(method, path, body=None, *, token=None, bid=1001, expected=200):
                headers = {'Authorization': 'Bearer ' + token, 'X-Business-Id': str(bid)} if token else {}
                r = await c.request(method, '/api' + path, json=body, headers=headers)
                assert r.status_code == expected, (path, expected, r.status_code, r.text[:700])
                return r.json()

            async def login(email):
                return (await call('POST', '/auth/login', {'email': email, 'password': PASSWORD}))['access_token']

            owner = await login(EMAIL)
            cashier = await login('delete-cashier@example.com')
            staff = await login('delete-stock@example.com')
            manager = await login('delete-manager@example.com')
            other = await login('delete-other@example.com')

            async def tables(deleted=False, bid=1001):
                return await call('GET', '/tables?deleted=' + str(deleted).lower(), token=owner, bid=bid)

            async def create(name, bid=1001):
                return await call('POST', '/tables', {'name': name, 'seats': 4}, token=owner, bid=bid)

            def payload(pid=1001, currency='THB'):
                return {'request_key': str(uuid4()), 'expected_currency': currency,
                        'items': [{'product_id': pid, 'quantity': 2, 'expected_price': 60}],
                        'note': 'Deletion fixture: no sugar'}

            async def send(qr, expected=200):
                return await call('POST', f'/public/tables/{qr}/orders', payload(), expected=expected)

            async def receipt(row):
                return await call('GET', '/public/table-orders/' + row['receipt_token'])

            a = await create('History table A')
            pending_table = await create('Pending table A')
            b = await create('Table B', bid=1002)
            tid, old_qr = a['id'], a['qr_token']
            baseline = await state()
            request = await send(old_qr)
            check('Guest order is pending without stock deduction or sale',
                  request['status'] == 'pending' and (await state())[:2] == baseline[:2])
            accepted = await call('POST', f"/table-orders/{request['id']}/accept", token=cashier)
            sale_id = accepted['order_id']
            saved = await state()
            check('Staff confirmation creates sale and deducts exactly 0.2 L only in A',
                  len(saved[1]) == 1 and abs(saved[0][1001] - 4.8) < 1e-9 and saved[0][1002] == 5,
                  sale_id=sale_id, stock_after=saved[0][1001])
            original_history = await call('GET', '/orders/paged', token=owner)
            check('Sale history records table, note and total before deletion',
                  original_history['total'] == 1 and original_history['items'][0]['table_name'] == a['name']
                  and original_history['items'][0]['customer_note'] == request['note']
                  and original_history['items'][0]['total_amount'] == 120)

            for name, token, expected in [('Anonymous', None, 401), ('Cashier', cashier, 403),
                                           ('Inventory staff', staff, 403), ('Other owner', other, 403)]:
                await call('DELETE', f'/tables/{tid}', token=token, expected=expected)
                check(name + ' cannot delete shop A table', await tables() == [a | {'pending_count': 0}, pending_table | {'pending_count': 0}])
            await call('DELETE', f'/tables/{tid}', token=owner, bid=1002, expected=404)
            check('Owner selecting B cannot delete A table', len(await tables()) == 2)

            waiting = await send(pending_table['qr_token'])
            await call('DELETE', f"/tables/{pending_table['id']}", token=owner, expected=409)
            check('Pending customer order blocks deletion with no stock or sale change',
                  (await state())[:2] == saved[:2] and not await audit_count('delete', pending_table['id']))
            await call('GET', f"/public/tables/{pending_table['qr_token']}/menu")
            check('Blocked deletion leaves original QR usable', True)

            before_delete = await state()
            await call('DELETE', f'/tables/{tid}', token=owner)
            active, archived = await tables(), await tables(True)
            check('Deleted table disappears from active list and seat count falls by four',
                  [t['id'] for t in active] == [pending_table['id']] and sum(t['seats'] for t in active) == 4)
            check('Deleted view retains same table id, name and seats, closed with a changed QR',
                  len(archived) == 1 and archived[0]['id'] == tid and archived[0]['name'] == a['name']
                  and archived[0]['seats'] == 4 and archived[0]['deleted_at'] is not None
                  and not archived[0]['is_active'] and archived[0]['qr_token'] != old_qr)
            deleted_qr = archived[0]['qr_token']
            for qr, label in [(old_qr, 'Original QR'), (deleted_qr, 'Archived QR')]:
                await call('GET', f'/public/tables/{qr}/menu', expected=404)
                await send(qr, expected=404)
                check(label + ' cannot open menu or submit a new order', True)
            check('Deletion preserves sale, order items, stock usage and guest requests', await state() == before_delete)
            check('POS history is unchanged after deletion', await call('GET', '/orders/paged', token=owner) == original_history)
            accepted_receipt = await receipt(request)
            check('Original guest receipt still shows accepted sale after deletion',
                  accepted_receipt['status'] == 'accepted' and accepted_receipt['order_id'] == sale_id
                  and accepted_receipt['order_status'] == 'completed' and accepted_receipt['table_name'] == a['name'])
            check('Delete audit is committed once', await audit_count('delete', tid) == 1)
            await call('DELETE', f'/tables/{tid}', token=owner)
            check('Repeated delete is idempotent and does not rotate QR or duplicate audit',
                  await tables(True) == archived and await audit_count('delete', tid) == 1)
            await call('PUT', f'/tables/{tid}', {'name': a['name'], 'seats': 4, 'is_active': True}, token=owner, expected=404)
            await call('POST', f'/tables/{tid}/rotate-qr', token=owner, expected=404)
            check('Archived table cannot bypass restore by editing or rotating QR', await tables(True) == archived)
            check('Deletion and archived list are isolated from shop B',
                  await tables(bid=1002) == [b | {'pending_count': 0}] and await tables(True, bid=1002) == [])

            await reopen()
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://fresh-delete-fixture') as fresh:
                r = await fresh.get('/api/tables?deleted=true', headers={'Authorization': 'Bearer ' + owner, 'X-Business-Id': '1001'})
                check('Deletion survives fresh connection pool and API client', r.status_code == 200 and r.json() == archived)
            check('Sale and stock remain committed after database reopen', await state() == before_delete)

            for name, token, expected in [('Anonymous', None, 401), ('Cashier', cashier, 403),
                                           ('Inventory staff', staff, 403), ('Other owner', other, 403)]:
                await call('POST', f'/tables/{tid}/restore', token=token, expected=expected)
                check(name + ' cannot restore shop A table', await tables(True) == archived)
            await call('POST', f'/tables/{tid}/restore', token=owner, bid=1002, expected=404)
            check('Restore cannot cross the selected shop boundary', await tables(True) == archived)
            await call('GET', '/tables?deleted=true', token=cashier, expected=403)
            check('Cashier cannot read archived table management', True)

            restored = await call('POST', f'/tables/{tid}/restore', token=manager)
            new_qr = restored['qr_token']
            check('Manager restores original table id, name and seats with a fresh QR',
                  restored['id'] == tid and restored['name'] == a['name'] and restored['seats'] == 4
                  and restored['deleted_at'] is None and new_qr not in (old_qr, deleted_qr))
            check('Restored table starts closed and moves out of deleted view',
                  not restored['is_active'] and len(await tables()) == 2 and await tables(True) == [])
            await call('GET', f'/public/tables/{new_qr}/menu', expected=404)
            await send(new_qr, expected=404)
            check('Restoration alone cannot accept orders until staff opens the table', True)
            again = await call('POST', f'/tables/{tid}/restore', token=owner)
            check('Repeated restore is idempotent with one audit and unchanged QR',
                  again == restored and await audit_count('restore', tid) == 1)
            check('Restore leaves original history, receipt and stocks unchanged',
                  await state() == before_delete and await receipt(request) == accepted_receipt
                  and await call('GET', '/orders/paged', token=owner) == original_history)
            await reopen()
            check('Restored state persists across another database reopen',
                  next(t for t in await tables() if t['id'] == tid) == restored | {'pending_count': 0})
            await call('PUT', f'/tables/{tid}', {'name': a['name'], 'seats': 4, 'is_active': True}, token=owner)
            menu = await call('GET', f'/public/tables/{new_qr}/menu')
            check('Opening restored table makes only the new QR menu available',
                  menu['table_name'] == a['name'] and [p['id'] for p in menu['products']] == [1001])
            for qr in (old_qr, deleted_qr):
                await call('GET', f'/public/tables/{qr}/menu', expected=404)
                await send(qr, expected=404)
            check('All old QR codes remain invalid even after restore and reopening', True)
            fresh_order = await send(new_qr)
            check('New QR submits a real pending order without deducting stock again',
                  fresh_order['status'] == 'pending' and fresh_order['id'] != request['id']
                  and (await state())[:2] == before_delete[:2])

            await call('POST', f"/table-orders/{waiting['id']}/reject", {'reason': 'Fixture rejection'}, token=cashier)
            await call('DELETE', f"/tables/{pending_table['id']}", token=manager)
            rejected = await receipt(waiting)
            check('After rejection table can be deleted and rejected receipt survives',
                  rejected['status'] == 'rejected' and rejected['rejection_reason'] == 'Fixture rejection'
                  and rejected['table_name'] == pending_table['name'])

            # Restore capacity limit is exercised only in this isolated fixture.
            async with sessions() as s:
                existing = (await s.execute(select(func.count()).select_from(DiningTable).where(
                    DiningTable.business_id == 1001, DiningTable.deleted_at.is_(None)))).scalar_one()
                s.add_all([DiningTable(business_id=1001, name=f'Capacity fixture {i}') for i in range(200-existing)])
                await s.commit()
            await call('POST', f"/tables/{pending_table['id']}/restore", token=owner, expected=409)
            check('Restore refuses to exceed 200 tables and leaves archived state intact',
                  len(await tables()) == 200 and (await tables(True))[0]['id'] == pending_table['id'])
            if not target_url:
                program = "import sqlite3,json,sys; c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); print(json.dumps({'deleted':c.execute('SELECT deleted_at IS NOT NULL,is_active FROM dining_tables WHERE id=?',(int(sys.argv[2]),)).fetchone(),'sale':c.execute('SELECT total_amount,status FROM orders WHERE id=?',(int(sys.argv[3]),)).fetchone()})); c.close()"
                result = subprocess.run([sys.executable, '-c', program, str(DB), str(pending_table['id']), str(sale_id)], check=True, capture_output=True, text=True)
                disk = json.loads(result.stdout)
                check('Independent process reads committed archive and original sale from disk',
                      disk['deleted'] == [1, 0] and disk['sale'] == [120, 'COMPLETED'])

        report = {'commit_under_test': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                  'database': 'isolated PostgreSQL' if target_url else 'isolated SQLite file with foreign keys enabled',
                  'production_writes': False, 'checks': len(checks), 'passed': len(checks),
                  'limitations': ['No production table was deleted or restored; browser interaction is not covered by this API suite.',
                                  'Startup migration and concurrent PostgreSQL row locking are not exercised.'],
                  'evidence': {'original_sale_id': sale_id, 'original_table_id': tid, 'restored_table_id': restored['id'],
                               'old_qr_menu_http': 404, 'old_qr_submit_http': 404,
                               'stock_before_order_litres': 5, 'stock_after_accept_delete_restore_litres': saved[0][1001],
                               'original_sale_total': 120, 'database_reopened': True},
                  'results': checks}
        output = ROOT / 'docs/performance/table-deletion-api-tests.json'
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({k: v for k, v in report.items() if k != 'results'}, indent=2))
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())

"""Self-purchase API regression on a dedicated database, never a live shop.

Run .venv/Scripts/python.exe backend/tests/test_self_purchase_receiving.py.
Default: unique SQLite file. PostgreSQL: SELF_PURCHASE_TEST_DATABASE_URL must
target loopback:55441/khunflow_self_purchase_test. No application lifespan or
production startup migrations run in this test.
"""
import asyncio
from datetime import datetime
from decimal import Decimal
import json
import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ['ENVIRONMENT'] = 'test'
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://unused:unused@127.0.0.1:1/unused_self_purchase_test'
os.environ['MIGRATION_DATABASE_URL'] = os.environ['DATABASE_URL']
os.environ['JWT_SECRET'] = 'self-purchase-test-only-secret-not-for-production-2026'
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
    IngredientUnit, Product, Recipe, RecipeItem, Supplier, GoodsReceiving, AuditLog,
    PurchaseOrder, Order)
from app.services.auth_service import get_password_hash

DB = ROOT / '.venv' / f'self-purchase-check-{uuid4().hex}.sqlite'
assert DB.parent == ROOT / '.venv' and DB.name.startswith('self-purchase-check-')
target_url = os.environ.get('SELF_PURCHASE_TEST_DATABASE_URL')
if target_url:
    target = make_url(target_url)
    assert target.drivername == 'postgresql+asyncpg'
    assert target.host in ('127.0.0.1', 'localhost') and target.port == 55441
    assert target.database == 'khunflow_self_purchase_test'
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
PASSWORD = 'SelfPurchaseFixture123!'
EMAIL = 'self-owner@example.com'

async def fixture_sessions():
    async with sessions() as session:
        yield session

async def initialize():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with sessions() as session:
        # Dedicated PostgreSQL databases must be empty; never reset an existing DB.
        assert (await session.execute(select(func.count()).select_from(Business))).scalar_one() == 0
        session.add_all([Business(id=1001, name='Self purchase test A'), Business(id=1002, name='Self purchase test B'), Business(id=1003, name='Other owner test')])
        await session.flush()
        for uid, email, role, bid in [(1001, EMAIL, UserRole.OWNER, 1001), (1002, 'self-cashier@example.com', UserRole.CASHIER, 1001), (1003, 'self-stock@example.com', UserRole.INVENTORY_STAFF, 1001), (1004, 'self-other@example.com', UserRole.OWNER, 1003)]:
            session.add(User(id=uid, email=email, full_name=email, hashed_password=get_password_hash(PASSWORD), role=role, business_id=bid))
        await session.flush()
        session.add_all([BusinessMembership(user_id=1001, business_id=1001, role=UserRole.OWNER), BusinessMembership(user_id=1001, business_id=1002, role=UserRole.OWNER), BusinessMembership(user_id=1002, business_id=1001, role=UserRole.CASHIER), BusinessMembership(user_id=1003, business_id=1001, role=UserRole.INVENTORY_STAFF), BusinessMembership(user_id=1004, business_id=1003, role=UserRole.OWNER)])
        session.add_all([Supplier(id=1001, name='Supplier A', business_id=1001), Supplier(id=1002, name='Supplier B', business_id=1002), Supplier(id=1003, name='Another supplier A', business_id=1001)])
        for iid, bid, stock, cost, unit in [(1001,1001,10,40,IngredientUnit.L), (1002,1002,7,80,IngredientUnit.L), (1003,1001,0,0,IngredientUnit.KG), (1004,1001,3,20,IngredientUnit.KG), (1005,1001,.3,.1,IngredientUnit.KG), (1006,1001,1,30,IngredientUnit.KG)]:
            session.add(Ingredient(id=iid, business_id=bid, name=f'Test ingredient {iid}', unit=unit, current_stock=stock, average_cost=cost))
        for pid in (1001,1006):
            session.add(Product(id=pid, business_id=1001, name=f'Test product {pid}', selling_price=90, food_cost=4))
        await session.flush()
        for pid in (1001,1006):
            session.add(Recipe(id=pid, business_id=1001, product_id=pid, total_cost=4))
        await session.flush()
        session.add(RecipeItem(recipe_id=1001, ingredient_id=1001, quantity=100, unit=IngredientUnit.ML, unit_cost=.04, total_cost=4))
        # An invalid legacy recipe lets us check rollback after a receipt was flushed.
        session.add(RecipeItem(recipe_id=1006, ingredient_id=1006, quantity=1, unit=IngredientUnit.L, unit_cost=30, total_cost=30))
        await session.commit()

async def main():
    global engine, sessions
    app.dependency_overrides[get_session] = fixture_sessions
    checks = []
    evidence = {}
    def check(name, passed, **details):
        assert passed, (name, details)
        checks.append({'name': name, 'passed': True, **details})
        print(f'PASS {len(checks):02d}: {name}', flush=True)
    def near(actual, expected):
        return abs(Decimal(str(actual)) - Decimal(str(expected))) < Decimal('0.00000001')
    async def snapshot():
        async with sessions() as s:
            ingredients = {i.id: (i.current_stock, i.average_cost) for i in (await s.execute(select(Ingredient))).scalars()}
            counts = [(await s.execute(select(func.count()).select_from(model))).scalar_one() for model in (GoodsReceiving, AuditLog, Order)]
            return ingredients, counts
    try:
        print('Preparing isolated database (no production connections)', flush=True)
        await initialize()
        print('Fixture ready; exercising API authentication and receiving', flush=True)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://self-purchase-fixture') as client:
            async def call(method, path, body=None, *, token=None, bid=1001, expected=200):
                headers = {'Authorization': 'Bearer '+token, 'X-Business-Id':str(bid)} if token else {}
                response = await client.request(method, '/api'+path, json=body, headers=headers)
                assert response.status_code == expected, (path, expected, response.status_code, response.text[:700])
                return response.json()
            async def login(email):
                return (await call('POST','/auth/login',{'email':email,'password':PASSWORD}))['access_token']
            owner = await login(EMAIL)
            cashier = await login('self-cashier@example.com')
            staff = await login('self-stock@example.com')
            other = await login('self-other@example.com')
            def payload(**overrides):
                return {'ingredient_id':1001,'supplier_id':None,'quantity':5,'unit_cost':52,'lot_number':'SELF-001','purchase_place':'  ตลาดสด  ','expiration_date':'2027-01-31', **overrides}
            async def receive(body, expected=200, token=owner, bid=1001):
                return await call('POST','/receiving',body,token=token,bid=bid,expected=expected)
            async def rejected(name, body, expected=422, token=owner, bid=1001):
                before = await snapshot()
                await receive(body,expected,token,bid)
                check(name, await snapshot() == before)

            before = await snapshot()
            await receive(payload())
            after = await snapshot()
            expected_average = (Decimal(10)*40+Decimal(5)*52)/15
            check('Self purchase with no supplier adds 5 to stock 10', near(after[0][1001][0],15), before=10, received=5, after=after[0][1001][0])
            check('Weighted average uses stock value, not simple price average', near(after[0][1001][1],expected_average), expected=float(expected_average), actual=after[0][1001][1])
            check('Receipt and audit commit without creating a sale', after[1] == [before[1][0]+1,before[1][1]+1,before[1][2]])
            async with sessions() as s:
                receipt = (await s.execute(select(GoodsReceiving).where(GoodsReceiving.lot_number=='SELF-001'))).scalar_one()
                receipt_id = receipt.id
                ingredient = await s.get(Ingredient,1001)
                check('Database receipt keeps null supplier, trimmed purchase place, lot, expiry and total', receipt.supplier_id is None and receipt.purchase_place=='ตลาดสด' and receipt.lot_number=='SELF-001' and receipt.expiration_date.isoformat()=='2027-01-31' and near(receipt.total_cost,260))
                check('Expiry is retained on ingredient', ingredient.expiration_date.isoformat()=='2027-01-31')
                product = await s.get(Product,1001); recipe = await s.get(Recipe,1001)
                check('Recipe and product cost update with 100 ml / litre conversion', near(product.food_cost,4.4) and near(recipe.total_cost,4.4))
                audit = (await s.execute(select(AuditLog).where(AuditLog.entity_type=='goods',AuditLog.entity_id==str(receipt_id)))).scalar_one()
                check('Audit records who received self purchase and where it was bought', audit.actor_id==1001 and audit.business_id==1001 and 'ซื้อมาเติมเอง' in audit.detail and 'ตลาดสด' in audit.detail)
            history = await call('GET','/receiving/paged',token=owner)
            row = next(r for r in history['items'] if r['id']==receipt_id)
            check('Paged history returns self-purchase source and total', row['source_type']=='self_purchase' and row['supplier_name']=='ซื้อมาเติมเอง' and row['purchase_place']=='ตลาดสด' and near(row['total_cost'],260) and history['total']==1 and near(history['summary']['amount'],260))
            legacy = await call('GET','/receiving',token=owner)
            check('Existing unpaged history also returns the saved self purchase', any(r['id']==receipt_id and r['purchase_place']=='ตลาดสด' for r in legacy))
            today = datetime.now(ZoneInfo('Asia/Bangkok')).date().isoformat()
            filtered = await call('GET',f'/receiving/paged?from={today}&to={today}',token=owner)
            check('Shop-local date filter includes receipt', any(r['id']==receipt_id for r in filtered['items']))

            second = payload(quantity=3,unit_cost=60,lot_number='SELF-002')
            second.pop('supplier_id'); second.pop('purchase_place');second.pop('expiration_date')
            await receive(second)
            state = await snapshot()
            expected_second = (Decimal(15)*44+Decimal(3)*60)/18
            check('Second self purchase accepts omitted supplier and place', near(state[0][1001][0],18) and near(state[0][1001][1],expected_second), stock=state[0][1001][0], average=state[0][1001][1])
            evidence = {'initial_stock':10,'initial_average':40,'receipts':[{'quantity':5,'unit_cost':52,'total':260},{'quantity':3,'unit_cost':60,'total':180}],'final_stock_after_two_self_purchases':state[0][1001][0],'expected_average_after_two':float(expected_second),'actual_average_after_two':state[0][1001][1]}
            first_page = await call('GET','/receiving/paged?limit=1',token=owner)
            second_page = await call('GET','/receiving/paged?limit=1&page=2',token=owner)
            check('Pagination keeps both receipts and summary spans every page', first_page['items'][0]['id']!=second_page['items'][0]['id'] and first_page['total']==2 and near(first_page['summary']['amount'],440))
            await receive(payload(ingredient_id=1003,quantity=2.5,unit_cost=30,lot_number='ZERO-STOCK'))
            state = await snapshot()
            check('Starting from zero stock adopts actual purchase unit cost', near(state[0][1003][0],2.5) and near(state[0][1003][1],30))
            await receive(payload(ingredient_id=1004,quantity=3,unit_cost=0,lot_number='FREE-STOCK'))
            state = await snapshot()
            check('A valid zero-cost receipt dilutes average correctly', near(state[0][1004][0],6) and near(state[0][1004][1],10))
            await receive(payload(ingredient_id=1005,quantity=.2,unit_cost=.3,lot_number='FRACTIONS'))
            state = await snapshot()
            check('Fractional quantity and prices are numerically correct', near(state[0][1005][0],.5) and near(state[0][1005][1],.18))
            await receive(payload(ingredient_id=1003,quantity=1,unit_cost=40,lot_number='STOCK-ROLE'),token=staff)
            check('Inventory staff can record self purchase with existing permissions', near((await snapshot())[0][1003][0],3.5))

            for name, body in [('Zero quantity rejected',payload(quantity=0)),('Negative quantity rejected',payload(quantity=-1)),('Negative price rejected',payload(unit_cost=-1)),('Invalid supplier zero rejected',payload(supplier_id=0)),('Oversized purchase place rejected',payload(purchase_place='x'*201))]:
                await rejected(name+' without partial writes',body)
            await rejected('Wrong-shop ingredient rejected without writes',payload(ingredient_id=1002),404)
            await rejected('Wrong-shop supplier rejected without writes',payload(supplier_id=1002),404)
            await rejected('Anonymous receiving rejected without writes',payload(),401,token=None)
            await rejected('Cashier receiving rejected without writes',payload(),403,token=cashier)
            await rejected('Other owner cannot write to shop A',payload(),403,token=other)
            await rejected('Owner selecting shop B cannot receive shop A ingredient',payload(),404,bid=1002)
            await rejected('Recipe recalculation failure rolls back stock, receipt and audit',payload(ingredient_id=1006),422)

            a_before = (await snapshot())[0][1001]
            b_history = await call('GET','/receiving/paged',token=owner,bid=1002)
            check('Shop B never sees shop A receiving history', b_history['total']==0)
            await receive(payload(ingredient_id=1002,quantity=1,unit_cost=100,lot_number='SHOP-B'),bid=1002)
            state = await snapshot()
            check('Shop B self purchase changes only its own stock and average', state[0][1001]==a_before and near(state[0][1002][0],8) and near(state[0][1002][1],82.5))
            b_history = await call('GET','/receiving/paged',token=owner,bid=1002)
            check('Shop B receipt is saved only in shop B history', b_history['total']==1 and b_history['items'][0]['lot_number']=='SHOP-B')

            await receive(payload(supplier_id=1001,quantity=2,unit_cost=50,lot_number='SUPPLIER-RECEIPT'))
            async with sessions() as s:
                row = (await s.execute(select(GoodsReceiving).where(GoodsReceiving.lot_number=='SUPPLIER-RECEIPT'))).scalar_one()
                check('Supplier receipt remains supported and does not inherit self-purchase place',row.supplier_id==1001 and row.purchase_place is None)
            po = await call('POST','/purchase-orders',{'supplier_id':1001,'items':[{'ingredient_id':1001,'quantity':4,'unit_cost':55}]},token=owner)
            await rejected('Self purchase cannot bypass supplier requirement of a PO',payload(purchase_order_id=po['id']))
            await rejected('PO must match the selected supplier',payload(supplier_id=1003,purchase_order_id=po['id']),409)
            await receive(payload(supplier_id=1001,purchase_order_id=po['id'],quantity=2,unit_cost=55,lot_number='PO-PARTIAL'))
            async with sessions() as s:
                check('Partial supplier receiving keeps PO open',(await s.get(PurchaseOrder,po['id'])).status.value=='ordered')
            await rejected('Supplier PO over-receipt is rejected without partial writes',payload(supplier_id=1001,purchase_order_id=po['id'],quantity=3),422)
            await receive(payload(supplier_id=1001,purchase_order_id=po['id'],quantity=2,unit_cost=55,lot_number='PO-COMPLETE'))
            async with sessions() as s:
                check('Completed supplier PO closes normally',(await s.get(PurchaseOrder,po['id'])).status.value=='received')
            await rejected('Completed PO cannot be received again',payload(supplier_id=1001,purchase_order_id=po['id'],quantity=1),409)

            saved = await snapshot()
            saved_history = await call('GET','/receiving/paged?limit=100',token=owner)
            # New SQLAlchemy engine/pool and HTTP client cannot reuse ORM instances.
            await engine.dispose()
            engine = make_engine();sessions = async_sessionmaker(engine,expire_on_commit=False)
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://fresh-self-purchase-fixture') as fresh:
                response = await fresh.get('/api/receiving/paged?limit=100',headers={'Authorization':'Bearer '+owner,'X-Business-Id':'1001'})
                check('History survives reopening the database pool and a fresh API client',response.status_code==200 and response.json()==saved_history)
            check('Stocks and average costs survive new database connections',await snapshot()==saved)
            if not target_url:
                program = "import sqlite3,json,sys; c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); print(json.dumps({'stock':c.execute('SELECT current_stock, average_cost FROM ingredients WHERE id=1001').fetchone(),'receipt':c.execute(\"SELECT supplier_id, purchase_place, quantity, unit_cost, total_cost FROM goods_receivings WHERE lot_number='SELF-001'\").fetchone()})); c.close()"
                result = subprocess.run([sys.executable,'-c',program,str(DB)],check=True,capture_output=True,text=True,encoding='utf-8')
                disk = json.loads(result.stdout)
                check('An independent process reads committed stock and self-purchase history from disk',near(disk['stock'][0],saved[0][1001][0]) and near(disk['stock'][1],saved[0][1001][1]) and disk['receipt']==[None,'ตลาดสด',5,52,260])
            evidence['final_history_count_shop_a'] = saved_history['total']
            evidence['database_reopened'] = True
        limitations = ['Database upgrade/startup migrations and concurrent receiving are not exercised by this suite.']
        if not target_url:
            limitations.append('PostgreSQL row-lock behavior is not exercised; Docker Desktop could not start, so this run used a SQLite file.')
        report = {'commit':subprocess.check_output(['git','rev-parse','--short','HEAD'],cwd=ROOT,text=True).strip(),'database':'isolated PostgreSQL' if target_url else 'isolated SQLite file with foreign keys enabled','checks':len(checks),'passed':len(checks),'production_writes':False,'limitations':limitations,'evidence':evidence,'results':checks}
        output = ROOT/'docs/performance/self-purchase-api-tests.json'
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False,indent=2))
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
